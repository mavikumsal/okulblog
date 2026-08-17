# Medya Sağlayıcı Bulguları

## Google Drive

Google Drive API küçük dosyalar için media veya multipart; 5 MB üzeri ve kesinti olasılığı olan yüklemeler için resumable upload öneriyor. Resumable akış oturum URI’si başlatma, içerik yükleme/izleme ve kesinti sonrası devam etme adımlarından oluşuyor. Entegrasyon için Google OAuth kapsamları ve kullanıcı/servis hesabı yetkilendirmesi ayrıca yapılandırılmalı.

Kaynak: https://developers.google.com/workspace/drive/api/guides/manage-uploads

## Bunny.net Storage

Bunny Edge Storage API, `https://{region}.storage.bunnycdn.com` taban URL’siyle HTTP üzerinden dosya yükleme, indirme ve yönetimi sağlıyor. Kimlik doğrulama `AccessKey` başlığıyla Storage Zone parolası üzerinden yapılıyor; hesap API anahtarı kullanılmamalı. Dosyaları son kullanıcıya sunmak için Storage Zone’un bir Pull Zone/CDN ile eşleştirilmesi gerekiyor.

Kaynak: https://bunny.net/docs/api-reference/storage

## Mimari sonucu

OkulBlog Medya Merkezi’nde S3 varsayılan sağlayıcı olarak korunmalı. Google Drive kişisel/kurumsal arşiv ve doküman aktarımı için OAuth tabanlı sağlayıcı olmalı. Bunny.net Storage görsel, doküman ve özellikle CDN sunumu için; Bunny Stream ise video yükleme/encode/oynatma için ayrı bir medya türü olarak ele alınmalı. Sağlayıcı sırları yalnızca sunucu ortamında tutulmalı; veritabanına dosyanın sağlayıcısı, dış kimliği, URL’si, MIME türü, boyutu ve sahiplik bilgisi kaydedilmeli.

## Google Search Console

Search Console API; Search Analytics performans sorguları, sitemap listeleme/gönderme/silme, Search Console mülklerini listeleme/ekleme/kaldırma ve URL Inspection ile URL durumunu inceleme servislerini sağlıyor. Performans sorguları tarih aralığı ve boyutlarla çalışıyor; sitemap işlemleri site URL’si ve sitemap yolu üzerinden yürütülüyor. URL Inspection ayrı `searchconsole.googleapis.com/v1` endpoint’iyle çağrılıyor.

Kaynak: https://developers.google.com/webmaster-tools/v1/api_reference_index

## Google Drive OAuth

Drive OAuth kapsamları Google Cloud Console’daki rıza ekranında ve uygulama kodunda birlikte tanımlanmalı. Google mümkün olan en dar kapsamı öneriyor; `drive.file` daha sınırlı bir erişim sağlar, tüm Drive dosyalarını yönetmek için `drive` kısıtlı kapsamdır ve doğrulama/güvenlik değerlendirmesi gerektirebilir. Kişisel Drive ve Workspace/Ortak Drive bağlantıları ayrı profil ve klasör hedefi olarak tutulmalı.

Kaynak: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
