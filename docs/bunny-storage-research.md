# Bunny Storage araştırma notu

Kaynaklar:
- https://bunny.net/docs/api-reference/storage/manage-files/upload-file
- https://bunny.net/docs/storage/http
- https://bunny.net/docs/api-reference/core

Bunny Storage HTTP API dosya yüklemek için `PUT` kullanır. URL biçimi `https://{region}.bunnycdn.com/{storageZoneName}/{path}/{fileName}` şeklindedir. Dosya gövdesi ham binary olarak gönderilmelidir; Base64 veya başka bir encoding kullanılmamalıdır. Kimlik doğrulama için `AccessKey` başlığında Storage Zone password/access key kullanılır. Bunny dokümanı özellikle global Bunny API key veya Stream API key yerine Storage Zone password kullanılmasını belirtir.

Depolama endpoint'i Storage Zone'ın birincil bölgesine göre değişir: Frankfurt için `storage.bunnycdn.com`, London için `uk.storage.bunnycdn.com`, New York ve Los Angeles için ilgili `ny`/`la` endpoint'leri, Singapore için `sg.storage.bunnycdn.com`, Stockholm için `se.storage.bunnycdn.com`, Sao Paulo için `br.storage.bunnycdn.com`, Johannesburg için `jh.storage.bunnycdn.com`, Sydney için `syd.storage.bunnycdn.com` kullanılabilir. Gerçek endpoint Admin bağlantı ayarlarında saklanmalıdır.

Yüklemede `Content-Type` ve isteğe bağlı olarak büyük harf hexadecimal SHA-256 `Checksum` başlığı gönderilebilir. Başarılı yükleme HTTP 201 döndürür; hatalı AccessKey, yanlış bölge endpoint'i veya binary olmayan gövde 401 ile sonuçlanabilir. Storage API ile GET üzerinden dosya indirme/listeleme ve DELETE ile silme yapılabilir. Kök dizin silme varsayılan olarak güvenlik nedeniyle engellidir.

Bunny Core Platform API'nin temel adresi `https://api.bunny.net` ve hesap düzeyi işlemler için `AccessKey` hesabın API anahtarıdır. İçerik yükleme için Core API key ile Storage Zone AccessKey birbirine karıştırılmamalıdır.

OkulBlog uygulama kararı: aktif depolama sağlayıcısı Bunny ise sunucu tarafında Storage Zone AccessKey ile Storage API'ye PUT yapılacak; kullanıcıya sunulacak URL ayrı Pull Zone/CDN yapılandırmasından üretilecek. Secret değerleri istemciye gönderilmeyecek. URL’den içe aktarma akışı boyut, MIME, uzantı, timeout, SSRF ve yönlendirme kontrolleriyle sınırlandırılacak; PDF önizleme için ilk sayfa/kapak metadata’sı hazırlanacak.
