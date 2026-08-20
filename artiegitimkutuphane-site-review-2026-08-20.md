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
