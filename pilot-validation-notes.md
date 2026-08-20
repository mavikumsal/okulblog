# Pilot aktarım doğrulama notu

- 20 Ağustos 2026: `/panel/soru-havuzu` Admin oturumuyla açıldı.
- Güncel dosyada duplicate React/useMemo importu görünmüyor; TypeScript ve production build başarılı.
- Soru havuzu ekranında `Yayın + cevap anahtarı pilot aktarımı` bölümü ve `Pilot aktarımı başlat` akışı mevcut.
- Mevcut soru havuzunda 36 soru görünüyor; bunlar önceki örnek sorular. Gerçek pilot PDF’leri henüz bu oturumda yüklenip başlatılmadı.
- Bir sonraki adım: pilot kartındaki iki file input’a `questions-1.pdf` ve `answers-1.pdf` yüklemek, ardından staging/parsing sonucunu doğrulamak.

Kaynak: Admin Soru Havuzu ekranı ve terminal TypeScript/build çıktısı.

Not: Sayfa uzun olduğu için görsel viewport üstte kaldı; browser markdown içeriği pilot kartının metnini doğruluyor.

## 20 Ağustos 2026 — Azure 403 düzeltmesi

- Pilot testinde tRPC `files.stageQuestionPdf` çağrısı, PDF bytes base64 olarak JSON gövdesinde taşındığı için Azure Application Gateway tarafından `403 Forbidden` HTML yanıtıyla engellendi; istemci bunu JSON olarak parse etmeye çalışınca `Unexpected token '<'` hatası oluştu.
- Çözüm olarak `/api/question-import/stage` Express route’u eklendi. Route admin oturumunu doğruluyor, `application/pdf` ikili gövdesini doğrudan alıyor, S3 staging’e yazıyor ve `{fileName, storageKey, publicUrl, sizeBytes}` döndürüyor.
- `ExternalQuestionPairImport` artık iki PDF’i doğrudan PUT ile staging route’una yükleyip mevcut `parseQuestionPdfPairFromStorage` tRPC prosedürünü çağırıyor. TypeScript incremental kontrolü 0 hata verdi.
- Gerçek pilot OCR/eşleştirme sonucu bu çözümden sonra yeniden çalıştırılacak.

## 20 Ağustos 2026 — Güncel POST teşhisi

- Eski `i1td8...` önizleme bundle’ı `/api/question-import/stage` için PUT çağrısı yapıyor ve Azure Application Gateway 403 döndürüyordu.
- Kaynak `ExternalQuestionPairImport.tsx` artık POST kullanıyor; restart sonrası güncel `i1td8...` önizleme açıldı ve kartta dosya alanları görünür durumda.
- Güncel sayfada pilot dosyaları henüz yeniden seçilip POST isteği ağ günlüğünde doğrulanmadı. Sonraki adım güncel inputlara iki PDF yükleyip düğmeye basmak ve ağ kaydında POST sonucunu kontrol etmektir.

## 20 Ağustos 2026 — Aktif önizleme ve tRPC doğrulama

- Aktif proje önizleme URL’si: `https://3000-i1td8lumdpldbbd38jey4-fa514f4d.us3.manus.computer`.
- Tarayıcıda pilot inputları `questions-1.pdf` ve `answers-1.pdf` olarak seçili görünüyor.
- Eski özel `/api/question-import/stage` çağrıları Azure Application Gateway tarafından 403 HTML yanıtıyla engellendi; ağ günlüğünde `content-type: application/pdf` görüldü.
- Kaynak bileşeninde staging çağrısı tRPC `files.stageQuestionPdf` prosedürüne çevrilmiş durumda; ancak bazı tarayıcı denemelerinde eski bundle çağrısı sürdüğü için zorunlu yenileme ve aktif preview URL kontrolü gerekiyor.
- Gerçek pilot OCR/eşleştirme sonucu henüz doğrulanmadı.

Son aktif önizleme taramasında pilot kartı görünür; iki input `Soru yayını PDF’i` ve `Cevap anahtarı PDF’i` olarak render ediliyor. Tarayıcı ekranında önceki `PDF staging yüklemesi başarısız (403)` toast’ı kalmış durumda. Kaynak bileşeninde güncel tRPC staging çağrısı görülüyor; gerçek güncel tRPC isteğinin ağ günlüğünde henüz kesin doğrulaması yok.

Son ekran doğrulaması: Pilot kartı görünür; iki PDF inputu seçili görünüyor ve `Pilot aktarımı başlat` butonu mevcut. Ağ günlüğünde 13:15 sonrası yalnızca sayfa tRPC GET çağrıları görüldü; yeni staging çağrısı kaydı oluşmadı. Bu, son tıklamaların pilot butonuna değil başka viewport öğelerine gitmiş olabileceğini gösteriyor. Tıklama koordinatı pilot butonunun yaklaşık orta ekran konumuna alınarak yeniden denenmeli.
38. Son doğrulama: My Browser’da questions-1.pdf ve answers-1.pdf görünür pilot inputlarına başarıyla yüklendi. Pilot kartı ve başlatma düğmesi DOM’da mevcut; ekran Admin önizleme modunda. Alt çubuk sayfanın canlı/public olarak paylaşılmadığını belirtiyor; bu yerel pilot testini engellemiyor, ancak yayın öncesi son kullanıcı doğrulaması için Publish gerektiriyor. Multipart staging kaynağı ExternalQuestionPairImport.tsx satır 96-131’de POST FormData kullanıyor; son gerçek OCR çağrısı henüz kesin başarıyla sonuçlanmadı.
39. Doğrudan parser doğrulaması: pilot-assets/compressed/questions-1.pdf (383,619 B) ve answers-1.pdf (374,054 B) her biri 1 sayfa. Metin katmanı bulunmadığı için questionCount=0, answerKeyCount=0, matchedCount=0 ve iki OCR uyarısı üretildi. Mevcut parser görüntüleri render ediyor ve kaynak sayfa önizlemesi hazırlıyor; ancak taranmış sayfalardaki metni OCR’a dönüştüren motor henüz bağlı değil. Bu nedenle OCR/eşleştirme pilot sonucu şu aşamada başarısız değil, beklenen 'OCR gerekir' durumunda duruyor. TypeScript, parser testleri (3/3) ve production build başarılı.
40. Görsel inceleme: questions-1.pdf tek sayfalık kapak görseli; soru metni/şıklar içermiyor. answers-1.pdf tek sayfalık etkinlik/çizelge sayfası; klasik 1-A, 2-B cevap anahtarı içermiyor. Bu iki dosya soru-cevap pilotu için teknik olarak geçerli eşleşen yayın/cevap anahtarı çifti değil. Parser’ın sıfır soru ve sıfır eşleşme vermesi bu nedenle beklenen sonuçtur; OCR motoru eklenmiş olsa bile bu sayfalardan soru blokları çıkarılamaz. Gerçek pilot için soru içeren yayın sayfası ve ona ait harfli cevap anahtarı sayfası seçilmeli.
41. Dış kaynak incelemesi: https://cevap-anahtari.artiegitimyayinlari.com/ portalı 1–4. sınıf seçimi sunuyor. 1. sınıf altında Check up, Günlük Ödevim, Hafta Sonu Ödevim, Kış Dostum Fasikülleri, Kısa Bir Mola Kasım Ara Tatil, Okuyorum Anlıyorum, Süper Güç, Süreç Değerlendirme ve Yaz Dostum seçenekleri var; seçilen kitap için sayfa 1–72 arası cevap anahtarı sayfaları listeleniyor. Bu portal gerçek cevap anahtarı görselleri için daha uygun pilot kaynağı olabilir; ancak soru PDF’inin aynı kitap ve sayfadan, yetkili kullanım kapsamında seçilmesi gerekiyor.

## Gerçek pilot kaynak doğrulaması — 2026-08-20

Kaynak sayfa: https://ilkokulluyum.com/2-sinif/test/2-sinif-hazirbulunusluk-sinavi-359
Soru PDF’i: https://www.ilkokulluyum.com/images/uploads/5e3270dc12a38a301c0c93602b3dc8bb45019a45dc2edb336e03532937393e950.pdf
Cevap anahtarı PDF’i: https://www.ilkokulluyum.com/files/uploads/a95430113e6ab6e3d549dfedc97ad6004f71098740cdc0e0ccb1c1c04cbc1dfd0.pdf

Kaynak sayfa 45 soruluk 2. sınıf hazırbulunuşluk sınavı ve ayrı cevap anahtarı indirme bağlantısı sunuyor. Parser sonucu: soru PDF’i 6 sayfa / 45 soru çıkardı; cevap PDF’i 1 sayfa ve taranmış görüntü olduğundan metin katmanından 0 cevap anahtarı bulundu. Görsel OCR fallback’ı eklendi ancak ilk çağrıda cevap eşleşmesi 0 kaldı; fallback hata loglaması ve içerik dizi dönüşü desteği sonraki teşhis için eklendi. İlk örnek sorularda seçenekler eksik/karışık olduğu için düşük güvenli manuel kontrol gerektiren kayıtlar oluştu.

Portal kontrolü: https://cevap-anahtari.artiegitimyayinlari.com/books/1.Sinif/Check_up/1.jpg — bu görsel cevap anahtarı değil, cevapları sayfa üzerinde yazılı bir çalışma sayfasıdır; pilot soru/cevap çifti olarak uygun bulunmadı.

## 2026-08-20 gerçek pilot doğrulaması

Admin Soru Havuzu ekranında `questions-ilkokulluyum.pdf` ve `answers-ilkokulluyum.pdf` dosyaları multipart staging üzerinden başarıyla yüklendi ve pilot aktarım çalıştırıldı. Arayüz sonucu: **45/45 soru seçili**, **28/45 cevap eşleştirildi**; sonuçlar taslak olarak hazırlandı. OCR çıktısı ve orijinal PDF yan yana gösteriliyor. Düşük güvenli örneklerde %34 ve `Manuel kontrol`, daha güvenilir örneklerde %70 ve cevap bilgisi gösteriliyor. Toplu kategori/zorluk/kazanım alanları ve `Görseli kırp` manuel düzeltme aksiyonu görünür durumda. Eşleşmeyen 17 kayıt için manuel kontrol ve cevap anahtarı formatı/okunabilirliği incelemesi açık.

Kaynak dosyalar: `/tmp/okulblog-pilot/questions-ilkokulluyum.pdf`, `/tmp/okulblog-pilot/answers-ilkokulluyum.pdf`.
Kaynak site: `https://www.ilkokulluyum.com/` üzerinden edinilen pilot dosyalar; içerik yalnızca yetkili kullanım ve admin incelemesi için taslakta tutuldu, otomatik yayın yapılmadı.
## Artı Eğitim portalı yeniden doğrulaması — 2026-08-20
Artı Eğitim cevap portalında 1. sınıf > Check up > 1.sayfa seçimi açıldı. Doğrudan görsel adresi `https://cevap-anahtari.artiegitimyayinlari.com/books/1.Sinif/Check_up/1.jpg` erişilebilir; görsel 595×765 boyutunda ve sorularla birlikte cevapların sayfa üzerine yazıldığı bir çalışma/etkinlik sayfası. Standalone A–D cevap anahtarı formatı olmadığı için soru-cevap eşleştirme pilotuna uygun eşleşmiş cevap anahtarı olarak seçilmedi. Portal 1–4. sınıf, kitap ve 1–72 sayfa seçimlerini dinamik olarak sunuyor. İçerik yalnızca yetkili kullanım ve admin taslağı bağlamında değerlendirilmelidir.
## FlipHTML5 kaynak doğrulaması — 2026-08-20
Kaynak: https://fliphtml5.com/bookcase/twjmz
Kitaplık başlığı `PROBLEM KİTAPLARIMIZ`; kitaplıkta 3 yayın görünüyor: `Problem Gezegeni 2`, `Problemde Yol Arkadaşım 3` ve `Problemde Yol Arkadaşım 4`. Kitaplık soru/cevap anahtarı çifti veya ayrı indirilebilir cevap anahtarı yapısını açıkça göstermiyor; bu nedenle yetkili eşleşmiş pilot çifti olarak seçilmedi. İçerik indirme/dönüştürme işlemi ancak yayın sahibinin izin verdiği erişim ve kullanım kapsamı netleştirildikten sonra yapılmalı.
## Admin manuel test — 2026-08-20
- My Browser ile `/panel/soru-havuzu` Admin oturumunda açıldı.
- Pilot aktarım kartı sayfada mevcut; `Soru yayını PDF’i`, `Cevap anahtarı PDF’i` ve `Pilot aktarımı başlat` kontrolleri görünür.
- Mevcut soru havuzunda 36 önceki örnek soru listeleniyor.
- Pilot inputlarına ulaşmak için sayfa içi kaydırma sürüyor; bu aşamada yeni PDF yükleme veya yeniden çalıştırma yapılmadı.

## Admin Manuel Testi — OCR Kalite ve Fark Vurgulama — 2026-08-20
- Gerçek `questions-ilkokulluyum.pdf` ve `answers-ilkokulluyum.pdf` dosyaları Admin Soru Havuzu ekranında seçildi ve pilot aktarımı başlatıldı.
- OCR sonucu ekranda `25/45 cevap eşleştirildi. Sonuçlar taslak olarak hazır.` bildirimi görüldü.
- Cevap anahtarı kalite kartı görünür: `1 sayfa · 19 numara-harf çifti · Kontrast 25`, `Manuel kontrol önerilir · %77`.
- Uyarılar: cevap anahtarı görüntü çözünürlüğü düşük; görüntü kontrastı düşük; numara ve harfler bulanık olabilir.
- Split-screen kartı görünür: `Soru 2 · Sayfa 1`, güven `%34`, `Görseli kırp`, `ORİJİNAL PDF`, `OCR METNİ · MANUEL DÜZELTME`, `OCR FARK VURGULAMA`, başlangıçta `0 eklenen · 0 çıkarılan`.
- 45/45 soru seçili ve toplu kategori/zorluk/kazanım kontrolleri görünür. Manuel metin alanı pilot sonucunda mevcut; kalite uyarısı ve fark paneli Admin’de render edildi.
- Kaynak: Admin paneli `/panel/soru-havuzu`, My Browser manuel gözlemi.

## ilkokul1dijital ZKitapX incelemesi — 2026-08-20
Kullanıcının verdiği `https://www.ilkokul1dijital.com/zkitapx.php?code=VlBBOEhGQTQ=` adresi bir PDF bağlantısı değil; `ZKitapX` başlıklı bir PHP kabuğu ve içinde `https://zkitapx.fernus.net/` iframe’i barındırıyor. Iframe parametresinde içerik kök yolu olarak `https://cdn.fernus.net/218/zk/x/p` ve bir `code` değeri bulunuyor.

Iframe doğrudan açıldığında Türkçe `Bu siteye erisim izniniz bulunmamaktadir. Site adresiniz :` mesajı döndü. Bu nedenle mevcut alan adı/oturum için okuyucu içeriği, PDF veya sayfa görselleri erişilebilir biçimde sunulmadı. Teknik olarak bu kaynak, önceki doğrudan PDF akışından farklı olarak istemci tarafı z-kitap okuyucusuna bağlı; erişim yetkisi ve yayın sahibinin indirme/API izni olmadan sayfa varlıklarını çekmek veya erişim kontrolünü aşmak uygun değildir.

OkulBlog’a güvenli entegrasyon yalnızca yayın sahibinin verdiği resmi PDF, export bağlantısı, API veya yetkili CDN erişim bilgileri sağlanırsa yapılabilir. Bu durumda kaynak türü için özel `zkitapx` import adaptörü; sayfa önizleme, taslak kuyruğu, OCR ve mevcut kalite kontrol akışına bağlanabilir. Şu anki URL ile otomatik çekme doğrulanamadı.
