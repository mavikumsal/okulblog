# Artı Eğitim Kütüphane — İlk İnceleme

İnceleme adresi: https://artiegitimkutuphane.com/

İnceleme tarihi: 20 Ağustos 2026.

Ana sayfa başlığı `Artı Eğitim Kütüphane` olarak döndü. Tarayıcı metin çıkarımında yalnızca site başlığı görüldü; soru bankası, sınav listesi, PDF bağlantısı, cevap anahtarı veya kategori bağlantısı görünür biçimde çıkarılamadı. Sayfa dinamik veya erişim korumalı olabilir. Bu aşamada hiçbir içerik indirilmedi, kopyalanmadı veya OkulBlog veritabanına aktarılmadı.

İçerik yapısını değerlendirmek için HTML/DOM bağlantılarının ayrıca incelenmesi ve gerekirse kullanıcı tarafından yetkilendirilmiş erişim sağlanması gerekiyor. Kaynağın kullanım/telif şartları doğrulanmadan toplu soru aktarımı başlatılmamalıdır.

## FlipHTML5 kitaplık bulgusu

Ana sayfadaki iframe şu kaynağa işaret ediyor: https://fliphtml5.com/bookcase/oqtwv/

Kitaplık başlığı `Artı Eğitim Yayınları` ve listeleme arayüzünde toplam 211 yayın görünüyor; ilk görünümde 1–55 aralığı listeleniyor. İçerikler 1–4. sınıf çalışma kitapları, fasiküller, denemeler ve yardımcı kaynaklar olarak düzenlenmiş.

Kitaplıkta cevap anahtarı olduğu açıkça başlıktan anlaşılabilen yayınlar da var. Örnekler: `1. SINIF KIŞ TATİL FASİKÜLLERİM 1. BÖLÜM CEVAPLAR`, `1. SINIF KIŞ TATİL FASİKÜLLERİM 2. BÖLÜM CEVAPLAR`, `2. SINIF KIŞ TATİL FASİKÜLLERİM 1. bölüm CEVAPLAR`, `2. SINIF KIŞ TATİL FASİKÜLLERİM 2 bölüm CEVAPLAR`, `3. SINIF KIŞ TATİL FASİKÜLLERİM 1 bölüm CEVAPLAR` ve `3. SINIF KIŞ TATİL FASİKÜLLERİM 2 bölüm CEVAPLAR`.

Bu yapı soru-cevap eşleştirmesi için umut verici olsa da, cevapların aynı yayının son sayfalarında mı yoksa ayrı yayınlarda mı tutulduğu tek tek yayın önizlemesiyle doğrulanmalıdır. 211 yayının tamamını otomatik olarak kopyalamak yerine, yetkili olunan belirli bir yayın seçilip önce taslak olarak işlenmelidir. İçeriklerin telif ve kullanım izni doğrulanmadan OkulBlog soru havuzuna toplu aktarım yapılmamalıdır.

## Tekil yayın incelemesi

Örnek yayın `1.SINIF PARAGRAF PROBLEM` şu FlipHTML5 adresinden açılabildi: https://online.fliphtml5.com/hpboy/plrg/

Yayın başlığı ve okuyucu kabuğu erişilebilir durumda; ancak tarayıcı metin çıkarımında sayfa içindeki soru metinleri, seçenekler veya cevap anahtarı görünmedi. Bu nedenle içeriklerin görsel sayfa görüntüleri üzerinden işlendiği ve doğrudan HTML metni olarak sunulmadığı anlaşılıyor. Soru havuzuna aktarım için sayfa görsellerinin OCR ile okunması, soru/şık bloklarının ayrıştırılması ve cevap anahtarının aynı yayındaki ilgili sayfalardan eşleştirilmesi gerekir. Bu işlem, kullanıcı tarafından yetkilendirilmiş belirli yayınlarla sınırlı ve taslak/onay kontrollü yapılmalıdır.

## Kaynak kitaplıkta pilot çift seçimi

Kaynak: https://fliphtml5.com/bookcase/oqtwv/

Kitaplık başlıklarında açık cevap anahtarı çiftleri bulundu: `1. SINIF KIŞ TATİL FASİKÜLLERİM 1. BÖLÜM`, `1. SINIF KIŞ TATİL FASİKÜLLERİM 1. BÖLÜM CEVAPLAR`, `1. SINIF KIŞ TATİL FASİKÜLLERİM 2. BÖLÜM` ve `1. SINIF KIŞ TATİL FASİKÜLLERİM 2. BÖLÜM CEVAPLAR`. Aynı yapı 2. ve 3. sınıf için de listeleniyor. Pilot için bu dört başlıklı 1. sınıf kış tatil fasikülü çifti, soru ve cevap yayınları açıkça adlandırıldığı için uygun adaydır. İçeriğin kullanım izni doğrulanmadan OkulBlog’da yayınlanmamalı; yalnızca taslak OCR önizlemesi yapılmalıdır.

İnceleme: 20.08.2026. Yayın kimlikleri okuyucu sayfasından ayrıca alınmalıdır.

## FlipHTML5 yayın kimlikleri

Kitaplık HTML’sinde 40 benzersiz `shot.jpg` yayın kimliği bulundu. Örnek okuyucu/önizleme URL’leri: `https://online.fliphtml5.com/hpboy/vvhi/files/shot.jpg?1`, `https://online.fliphtml5.com/hpboy/ywbg/files/shot.jpg?1`, `https://online.fliphtml5.com/hpboy/xsli/files/shot.jpg?1`, `https://online.fliphtml5.com/hpboy/gvfa/files/shot.jpg?1`, `https://online.fliphtml5.com/hpboy/plrg/files/shot.jpg?1`, `https://online.fliphtml5.com/hpboy/fbth/files/shot.jpg?1`, `https://online.fliphtml5.com/hpboy/sqzz/files/shot.jpg?1`, `https://online.fliphtml5.com/hpboy/vwnh/files/shot.jpg?1`, `https://online.fliphtml5.com/hpboy/egrk/files/shot.jpg?1`, `https://online.fliphtml5.com/hpboy/jfra/files/shot.jpg?1`. HTML düz metin akışında başlıklar ile URL’ler ayrı listelendiği için bu aşamada belirli kış tatil fasikülü başlıklarının kimlikleri kesin eşleştirilemedi; tekil kitap metadata’sı veya okuyucu bağlantı kayıtlarıyla doğrulama gerekir.

## Pilot soru yayını okuyucu kontrolü

Seçilen soru yayını: https://online.fliphtml5.com/hpboy/vtaz/

Başlık: `1. SINIF KIŞ TATİL FASİKÜLLERİM 1. BÖLÜM`; okuyucu 82 sayfa gösteriyor. Görünür kontroller: yakınlaştırma, arama, küçük resimler, içindekiler, otomatik çevirme, ses, paylaşım ve tam ekran. Görünür bir PDF indirme kontrolü bulunmadı. Bu nedenle pilot dosya hazırlama, erişim kontrolünü aşmadan okuyucunun sunduğu sayfa görsellerini kullanma veya kaynağın izinli PDF’sini sağlama seçeneklerinden biriyle yapılmalıdır. Test için doğrudan PDF indirme URL’si varsayılmamalıdır.

İnceleme: 20.08.2026.

## Pilot cevap yayını okuyucu kontrolü

Seçilen cevap yayını: https://online.fliphtml5.com/hpboy/cmil/

Başlık: `1. SINIF KIŞ TATİL FASİKÜLLERİM 1. BÖLÜM CEVAPLAR`; okuyucu 48 sayfa gösteriyor. Sayfalar görsel okuyucu içinde sunuluyor; metin çıkarımında cevap harfleri metin olarak gelmedi. Görsel önizlemede sayfa içeriği okunabilir durumda ve soru yayınıyla aynı fasikül/1. bölüm başlığını taşıyor. Bu çift, izinli pilot için soru yayını `vtaz` ve cevap yayını `cmil` olarak seçildi.

İnceleme: 20.08.2026.

## Pilot PDF görsel doğrulaması

Oluşturulan pilot soru PDF’inin ilk sayfası fasikül kapağıdır; OCR için asıl soru sayfaları sonraki sayfalarda bulunacaktır. Cevap PDF’inin ilk sayfası doğrudan çalışma/cevap içeriği içeriyor ve görselde cevaplanan tablo ile `Şifre` alanı okunabilir durumda. Bu, kaynak başlık eşleşmesini doğruluyor; ancak ilk soru PDF sayfası ile ilk cevap PDF sayfası içerik türü bakımından birebir soru-cevap çifti değildir. Sayfa hizalaması içerik sayfaları üzerinden yapılmalıdır.
