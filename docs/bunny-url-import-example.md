# Bunny.net URL’den Doküman İçe Aktarma Örneği

Bu örnek, Admin’in verdiği herkese açık bir doküman URL’sini sunucu tarafında indirip Bunny Storage Zone’a ham binary olarak yükleyen temel akışı gösterir. **Bunny Storage AccessKey**, global Bunny API key değildir; Storage Zone’ın Access/FTP & API bölümündeki paroladır.

> Üretim ortamında API anahtarları tarayıcıya gönderilmemeli, yalnızca sunucu ortam değişkenlerinde tutulmalıdır.

## Python örneği

```python
# pip install fastapi uvicorn requests pydantic
from __future__ import annotations

import hashlib
import ipaddress
import os
import socket
from pathlib import PurePosixPath
from urllib.parse import urlparse

import requests
from fastapi import FastAPI, HTTPException
from pydantic import AnyHttpUrl, BaseModel

app = FastAPI()
MAX_BYTES = 20 * 1024 * 1024
ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
}

class ImportRequest(BaseModel):
    source_url: AnyHttpUrl
    file_name: str | None = None
    folder: str = "okulblog/documents"


def assert_public_url(value: str) -> tuple[str, str]:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname:
        raise HTTPException(400, "Yalnızca HTTPS bağlantılara izin verilir.")
    host = parsed.hostname
    try:
        addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise HTTPException(400, "Kaynak adres çözümlenemedi.") from exc
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise HTTPException(400, "Özel veya iç ağ adreslerine izin verilmiyor.")
    return value, host


def safe_name(value: str) -> str:
    base = PurePosixPath(value).name
    cleaned = "".join(ch if ch.isalnum() or ch in ".- _" else "-" for ch in base)
    return cleaned.strip().replace(" ", "-")[:180] or "document.pdf"


def download_document(url: str) -> tuple[bytes, str, str]:
    checked_url, _ = assert_public_url(url)
    with requests.get(
        checked_url,
        stream=True,
        timeout=(8, 45),
        allow_redirects=False,
        headers={"User-Agent": "OkulBlogDocumentImporter/1.0"},
    ) as response:
        if response.status_code not in (200, 206):
            raise HTTPException(400, "Kaynak dosya indirilemedi.")
        content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
        if content_type not in ALLOWED_TYPES:
            raise HTTPException(415, "Bu dosya türü desteklenmiyor.")
        declared_size = int(response.headers.get("content-length", "0") or 0)
        if declared_size > MAX_BYTES:
            raise HTTPException(413, "Dosya boyutu 20 MB sınırını aşıyor.")
        chunks: list[bytes] = []
        total = 0
        for chunk in response.iter_content(1024 * 256):
            total += len(chunk)
            if total > MAX_BYTES:
                raise HTTPException(413, "Dosya boyutu 20 MB sınırını aşıyor.")
            chunks.append(chunk)
        return b"".join(chunks), content_type, checked_url


def upload_to_bunny(content: bytes, file_name: str, content_type: str) -> dict[str, str | int]:
    zone = os.environ["BUNNY_STORAGE_ZONE"]
    access_key = os.environ["BUNNY_STORAGE_ACCESS_KEY"]
    endpoint = os.getenv("BUNNY_STORAGE_ENDPOINT", "https://storage.bunnycdn.com").rstrip("/")
    cdn_base = os.environ["BUNNY_PULL_ZONE_URL"].rstrip("/")
    safe_file = safe_name(file_name)
    path = f"okulblog/documents/{safe_file}"
    digest = hashlib.sha256(content).hexdigest().upper()
    response = requests.put(
        f"{endpoint}/{zone}/{path}",
        data=content,
        timeout=60,
        headers={
            "AccessKey": access_key,
            "Content-Type": content_type,
            "Checksum": digest,
        },
    )
    if response.status_code != 201:
        raise HTTPException(502, "Bunny Storage yüklemesi başarısız oldu.")
    return {
        "provider": "bunny-storage",
        "provider_asset_id": path,
        "public_url": f"{cdn_base}/{path}",
        "file_name": safe_file,
        "mime_type": content_type,
        "size_bytes": len(content),
    }


@app.post("/admin/documents/import-url/preview")
def preview_document(request: ImportRequest):
    content, content_type, source_url = download_document(str(request.source_url))
    name = safe_name(request.file_name or urlparse(source_url).path.split("/")[-1])
    return {
        "source_url": source_url,
        "file_name": name,
        "mime_type": content_type,
        "size_bytes": len(content),
        "sha256": hashlib.sha256(content).hexdigest(),
        "requires_category": True,
        "status": "preview_ready",
        # Üretimde preview_url, upload sonrası Bunny Pull Zone URL’sidir.
    }


@app.post("/admin/documents/import-url/publish")
def publish_document(request: ImportRequest):
    content, content_type, source_url = download_document(str(request.source_url))
    name = safe_name(request.file_name or urlparse(source_url).path.split("/")[-1])
    result = upload_to_bunny(content, name, content_type)
    result.update({"source_url": source_url, "status": "uploaded"})
    # Burada veritabanına media_assets + documents/content kaydı yapılır.
    return result
```

## PHP cURL örneği

```php
<?php
$zone = getenv('BUNNY_STORAGE_ZONE');
$accessKey = getenv('BUNNY_STORAGE_ACCESS_KEY');
$endpoint = rtrim(getenv('BUNNY_STORAGE_ENDPOINT') ?: 'https://storage.bunnycdn.com', '/');
$pullZone = rtrim(getenv('BUNNY_PULL_ZONE_URL'), '/');
$filePath = __DIR__ . '/document.pdf';
$fileName = basename($filePath);
$contents = file_get_contents($filePath);
if ($contents === false) {
    throw new RuntimeException('Dosya okunamadı.');
}
if (strlen($contents) > 20 * 1024 * 1024) {
    throw new RuntimeException('Dosya boyutu 20 MB sınırını aşıyor.');
}
$storagePath = 'okulblog/documents/' . preg_replace('/[^a-zA-Z0-9._-]/', '-', $fileName);
$checksum = strtoupper(hash('sha256', $contents));
$url = $endpoint . '/' . rawurlencode($zone) . '/' . str_replace('%2F', '/', rawurlencode($storagePath));

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => 'PUT',
    CURLOPT_POSTFIELDS => $contents,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_HTTPHEADER => [
        'AccessKey: ' . $accessKey,
        'Content-Type: application/pdf',
        'Checksum: ' . $checksum,
    ],
]);
$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$error = curl_error($ch);
curl_close($ch);
if ($error || $status !== 201) {
    throw new RuntimeException('Bunny yükleme başarısız: ' . ($error ?: $response));
}
$publicUrl = $pullZone . '/' . $storagePath;
echo json_encode([
    'provider' => 'bunny-storage',
    'provider_asset_id' => $storagePath,
    'public_url' => $publicUrl,
    'file_name' => $fileName,
    'mime_type' => 'application/pdf',
    'size_bytes' => strlen($contents),
], JSON_UNESCAPED_SLASHES);
```

## Admin önizleme sözleşmesi

URL’den indirme tamamlandığında yayınlamadan önce aşağıdaki alanlar gösterilmelidir:

| Alan | Açıklama |
|---|---|
| Kaynak URL | Dosyanın geldiği adres; yalnızca admin görür |
| Dosya adı | Admin’in değiştirebileceği temizlenmiş dosya adı |
| Tür ve boyut | PDF/DOCX/PPTX ve MB bilgisi |
| SHA-256 | Aynı dosyanın tekrar yüklenmesini yakalamak için checksum |
| Kapak/ilk sayfa | PDF için ilk sayfadan oluşturulan görsel önizleme |
| Hedef sağlayıcı | Aktif depolama: Bunny, S3 veya ileride Drive |
| Kategori yolu | Eğitim/Kurum seçimi ve tam breadcrumb |
| Durum | Önizleme hazır, taslak veya yayınlandı |

Önizleme ekranında **“Taslak kaydet”** ve **“Kategori seçip yayınla”** aksiyonları bulunmalı; dosya kategori seçilmeden public içerik sorgularına eklenmemelidir.

## Kaynak

Bunny Storage yükleme isteği ham binary `PUT`, `AccessKey`, bölgesel Storage endpoint’i ve isteğe bağlı büyük harf SHA-256 checksum kullanır: [Bunny Upload File](https://bunny.net/docs/api-reference/storage/manage-files/upload-file), [Bunny HTTP Storage](https://bunny.net/docs/storage/http).
