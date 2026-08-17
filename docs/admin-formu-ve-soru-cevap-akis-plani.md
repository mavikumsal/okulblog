# OkulBlog Admin İçerik Formu ve Üye Soru-Cevap Editörü Akış Planı

## 1. Amaç ve temel karar

Admin panelindeki içerik oluşturma deneyimi, teknik altyapıdaki tüm ayrıntıları kullanıcıya göstermek yerine yalnızca içerik yayınlama kararlarına odaklanmalıdır. Kullanıcının karşısına yedi temel içerik kategorisi çıkacaktır: **Testler, Dökümanlar, Videolar, Simülasyonlar, Oyunlar, Sorular ve Soru-Cevap**.

Bu yedi başlık, hem **Eğitim** hem de **Kurum** kategori ağaçlarında kullanılacaktır. Eğitim ağacı; ana grup, okul kademesi, sınıf, ders, ünite ve kazanım yapısını izler. Kurum ağacı ise kurum veya sınav odaklı alt kategorileri izler. İçerik türü ile kategori kaynağı birbirinden ayrı ama zorunlu seçimlerdir.

> **Ana kural:** Bir içerik, kategori seçilmeden yayınlanamaz. “İsteğe bağlı”, “kategori seçmeden devam et” veya boş kategori seçenekleri kaldırılacaktır.

## 2. Yeni Admin paneli bilgi mimarisi

Admin panelinde içerik alanı aşağıdaki yedi modül olarak sunulacaktır. Her modül kendi içerik formuna sahip olacak; ortak alanlar aynı tasarım ve doğrulama kurallarıyla çalışacaktır.

| Modül | İçerik amacı | Zorunlu kategori kaynağı | Özel alanlar |
|---|---|---|---|
| Testler | Soru havuzundan süreli test oluşturma | Eğitim veya Kurum | Süre, sorular, puanlama, kapak |
| Dökümanlar | PDF, çalışma kâğıdı veya metin paylaşma | Eğitim veya Kurum | Dosya, açıklama, kapak |
| Videolar | Video veya video bağlantısı paylaşma | Eğitim veya Kurum | Video URL/embed, süre, kapak |
| Simülasyonlar | Etkileşimli öğrenme içeriği sunma | Eğitim veya Kurum | Embed/uygulama bağlantısı, kapak |
| Oyunlar | Eğitim amaçlı oyun paylaşma | Eğitim veya Kurum | Oyun URL/embed, yaş seviyesi, kapak |
| Sorular | Soru havuzuna tekli veya çoklu soru ekleme | Eğitim veya Kurum | Soru, cevaplar, doğru cevap, zorluk |
| Soru-Cevap | Üye soruları ve topluluk cevapları | Eğitim veya Kurum | Soru metni, görsel, moderasyon |

### Kullanıcıya gösterilmeyecek teknik alanlar

**Test ID, İçerik ID, Medya ID ve `attachment` rolü** gibi alanlar normal içerik oluşturma akışından çıkarılacaktır. Bunlar içerik üreticisinin günlük işi değildir. Bir dosyanın sonradan mevcut kayda bağlanması gerekirse bu işlem yalnızca **Medya Merkezi > Gelişmiş ilişkilendirme** ekranında Admin’e gösterilecektir.

Böylece içerik oluşturan kişi önce “ne paylaşacağım, hangi kategoriye ait, öğrenci bunu nasıl görecek?” sorularını cevaplar; teknik medya ilişkisi arka planda veya ayrı bir yönetim ekranında kalır.

## 3. Ortak içerik oluşturma akışı

### Adım 1 — İçerik türünü seç

Admin, önce yedi karttan birini seçer. Seçimden sonra yalnızca o içerik türüne ait form açılır. Aynı sayfada Test, Döküman, Video, Simülasyon, Oyun, Soru ve Soru-Cevap alanlarının tamamını birden göstermekten kaçınılacaktır.

### Adım 2 — Kategori kaynağını seç

Formun başında iki seçenek bulunur:

| Seçenek | Kullanım |
|---|---|
| Eğitim kategorileri | Okul, sınıf, ders, ünite ve kazanım temelli içerikler |
| Kurum kategorileri | KPSS, kamu kurumu veya kurum/sınav temelli içerikler |

Varsayılan olarak hiçbir seçenek seçili gelmez. Admin kategori kaynağını seçmeden alt kategori listesi açılmaz. Bu davranış yanlış kategori seçimini azaltır.

### Adım 3 — Hiyerarşik kategoriyi tamamla

Kategori seçimleri üstten alta doğru ilerler. Örneğin Eğitim için **İlkokul → 1. Sınıf → Türkçe → Ünite → Kazanım**, Kurum için ise **Kurum → Sınav grubu → Konu → Alt konu** gibi bir yol gösterilir.

Seçim tamamlandığında formda küçük bir özet görünür:

> **Kategori:** Eğitim · İlkokul · 1. Sınıf · Türkçe · Okuma · Ana fikir

Kategori tamamlanmadan Kaydet veya Yayınla düğmesi etkinleşmez.

### Adım 4 — İçerik bilgilerini doldur

Tüm içerik türlerinde ortak alanlar aynı sırayla gösterilir: başlık, kısa açıklama, kapak görseli, kategori yolu ve yayın durumu. İçerik türüne özel alanlar bu ortak bölümün altında açılır.

| Ortak alan | Kural |
|---|---|
| Başlık | En az 3 karakter; öğrenci ekranında anlaşılır olmalı |
| Kısa açıklama | Liste ve ana sayfa kartlarında kullanılabilir |
| Kapak görseli | Ana sayfa kartları için önerilir; içerik türüne göre standart oran uygulanır |
| Kategori | Eğitim veya Kurum ağacından zorunlu, tamamlanmış seçim |
| Durum | Taslak, incelemede veya yayında; yetkiye göre değişir |

### Adım 5 — Ön izleme ve kaydetme

Admin, içerik kaydedilmeden önce öğrenci görünümünü açabilmelidir. Ön izleme; başlık, kapak, kategori yolu, açıklama ve içerik türüne özel alanları gösterir. Kaydetme işleminden önce kategori eksikliği, başlık uzunluğu, dosya türü ve bağlantı geçerliliği kontrol edilir.

## 4. Yedi modül için sade form yapısı

### Testler

Test formu; başlık, kapak, **zorunlu Eğitim/Kurum kategorisi**, süre ve soru havuzundan seçilecek sorulardan oluşur. “Medya bağla” alanı bu formdan çıkarılır. Test oluşturulduktan sonra test arşivinde yalnızca test başlığı, kategori yolu, soru sayısı, süre ve durum gösterilir.

### Dökümanlar

Döküman formu; başlık, kapak, **zorunlu kategori**, dosya yükleme, kısa açıklama ve yayın durumundan oluşur. Dosya yükleme ile içerik kaydının ilişkilendirilmesi tek işlemde yapılır; Admin’in ID kopyalaması gerekmez.

### Videolar

Video formu; başlık, kapak, **zorunlu kategori**, video URL’si veya embed kodu, açıklama ve yayın durumundan oluşur. YouTube veya harici video bağlantısı için güvenli URL doğrulaması uygulanır.

### Simülasyonlar ve Oyunlar

Bu iki formda ortak olarak başlık, kapak, **zorunlu kategori**, uygulama/oyun bağlantısı veya embed alanı, kısa açıklama ve yayın durumu bulunur. Embed kodu doğrudan HTML olarak çalıştırılmadan önce izin verilen sağlayıcı ve alan adı kontrolünden geçirilir.

### Sorular

Soru formu; soru metni, cevap seçenekleri, doğru cevap, açıklama, görsel, zorluk, etiketler ve **zorunlu Eğitim/Kurum kategorisi** alanlarını içerir. Soru havuzuna kaydedilmeden önce editör ön izlemesi yapılır.

### Soru-Cevap

Soru-Cevap bölümü iki ayrı kullanım içerir. Üye tarafında yeni soru ve cevap gönderimi bulunur; Admin tarafında moderasyon, kategori düzeltme, yayınlama ve gizleme işlemleri bulunur. Her soru **zorunlu Eğitim/Kurum kategorisine** bağlanır.

## 5. Üye Soru-Cevap rich text ve görsel editörü

### Tasarım hedefi

Editör, üyeye bir belge düzenleme yazılımı kadar karmaşık görünmemeli; ancak düz bir textarea kadar sınırlı da olmamalıdır. Üyenin amacı biçim gösterisi yapmak değil, sorusunu anlaşılır biçimde anlatmaktır. Bu nedenle araç çubuğu kısa, anlaşılır ve mobilde yatay taşma yapmayacak şekilde tasarlanacaktır.

### Önerilen araç çubuğu

| Araç | Kullanım |
|---|---|
| Kalın | Önemli kavramları vurgulamak |
| İtalik | Terim veya kısa vurgu |
| Sırasız liste | Birden fazla maddeyi yazmak |
| Sıralı liste | Adım veya seçenekleri sıralamak |
| Bağlantı | Kaynak veya ilgili sayfa eklemek |
| Görsel ekle | Soruya veya cevaba açıklayıcı görsel yüklemek |
| Temizle | Biçimlendirmeyi kaldırmak |

Başlık seviyeleri, tablo, renk paleti ve özel HTML gibi ileri araçlar üye editöründe bulunmayacaktır. Bu sınır, okunabilirliği ve moderasyonu kolaylaştırır.

### Görsel yükleme kuralları

Üye görseli seçtiğinde istemci tarafında dosya türü ve boyutu kontrol edilir. İzin verilen türler JPEG, PNG ve WebP; önerilen dosya boyutu en fazla 5 MB olacaktır. Görsel sunucuya gönderilmeden önce güvenli bir adlandırma uygulanır ve medya S3 depolama akışına aktarılır.

Görselin doğal ölçüsü ne olursa olsun editörde sabit ve tutarlı görünmesi için kare ön izleme uygulanır. Soru havuzundaki standarttan farklı olarak Soru-Cevap görsellerinde okunabilirliği koruyan **en fazla 1200 px uzun kenar** ve **kare ön izleme** yaklaşımı kullanılabilir. Görselin en-boy oranı kırpılmadan, kare alan içine sığdırılarak gösterilmelidir.

### İçerik ve güvenlik kuralları

Editör çıktısı HTML olarak saklanabilir; ancak görüntüleme sırasında yalnızca izin verilen etiketler ve nitelikler temizlenmiş biçimde render edilmelidir. Script, iframe, event handler, inline style ve bilinmeyen URL şemaları kabul edilmeyecektir. Bağlantılarda yalnızca HTTPS veya güvenli dahili yollar kullanılmalıdır.

Üye soru ve cevapları doğrudan yayına alınmayacaktır. Yeni kayıtların varsayılan durumu **Beklemede** olmalıdır. Admin incelemesinden sonra kayıt **Yayında** veya **Gizli** durumuna geçirilebilir. Görseller de aynı kaydın moderasyon durumuna bağlı olarak gösterilmelidir.

### Üye deneyimi

Misafirler yayınlanmış soruları ve cevapları okuyabilir; soru veya cevap yazma düğmesine bastığında giriş ekranına yönlendirilir. Giriş yapmış üyeler kategori seçmeden gönderim yapamaz. Gönderimden sonra kullanıcıya kaydın moderasyon beklediği açıkça bildirilir.

Mobil görünümde araç çubuğu iki satıra geçebilir. Görsel ön izleme, kaldırma düğmesi ve hata mesajı klavye ile erişilebilir olmalıdır. Gönder düğmesi; başlık, metin ve kategori doğrulanmadan etkinleşmemelidir.

## 6. Kabul kriterleri

| Alan | Kabul kriteri |
|---|---|
| Kategori | Yedi modülün tamamında Eğitim veya Kurum kategorisi zorunlu seçilir |
| Form sadeliği | Test ID, İçerik ID, Medya ID ve attachment alanları normal formlarda görünmez |
| Medya | Dosya yükleme içerik formunun parçasıdır; sonradan ilişkilendirme yalnızca Medya Merkezi’ndedir |
| Soru-Cevap | Üye soru ve cevapları rich text, görsel ve moderasyon durumunu destekler |
| Arama | Kategori yolu ve içerik türü kullanıcıya açık biçimde görünür |
| Güvenlik | HTML temizleme, dosya türü/boyutu ve bağlantı doğrulaması uygulanır |
| Doğrulama | Vitest, TypeScript, production build ve masaüstü/mobil görsel kontrol başarılı olur |

## 7. Uygulama sırası

İlk aşamada Panel’deki Test arşivi ve İçerik arşivi içinden **Medya bağla** kutuları kaldırılacaktır. Sonraki aşamada içerik formları yedi kategori kartına bölünecek ve ortak zorunlu kategori bileşeni kullanılacaktır. Ardından backend create/update prosedürleri kategori olmadan kayıt kabul etmeyecek şekilde güncellenecektir.

Üçüncü aşamada Soru-Cevap editörünün görsel, erişilebilirlik ve sanitizasyon kuralları uygulanacaktır. Son aşamada tüm modüllerde form gönderimi, kategori eksikliği, misafir kısıtı, görsel yükleme ve moderasyon durumları test edilecek; responsive görsel denetimden sonra checkpoint alınacaktır.
