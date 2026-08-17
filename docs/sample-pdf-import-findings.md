# Örnek PDF Ayrıştırma Bulguları

İncelenen dosya: `2.-SINIF-TÜRKÇE-1.-DÖNEM-3.-HAFTA-CEVAP-ANAHTARSIZ-TEK-PARÇA.pdf`

PDF metin katmanı mevcut ve `pdftotext -layout` ile okunabiliyor. Belge ilkokul 2. sınıf Türkçe çalışma sayfalarından oluşuyor; sayfa başlıkları arasında “Satır Sonuna Sığmayan Sözcükler”, “Alfabetik Sıralama Etkinliği”, “Sözcükte Anlam”, “Okuma - Anlama” ve “Harf Bilgisi” bulunuyor.

Her çalışma sayfasında soru numaraları çoğunlukla `1.`, `2.`, `3.` ve `4.` biçiminde başlıyor. PDF tek parça ve cevap anahtarsız; bu nedenle örnek dosyada doğru cevaplar çıkarılamıyor. Aktarım arayüzünde cevap anahtarı yoksa doğru cevabın boş bırakılması ve kullanıcı tarafından ön izleme/düzenleme ekranında seçilmesi gerekiyor.

Belgede iki sütunlu sayfalar, kelime listeleri, boşluk doldurma, eşleştirme, boyama ve açık uçlu etkinlikler bulunuyor. Bu nedenle yalnızca soru numarasıyla bölmek yeterli değil; soru türü otomatik tahmin edilmeli ve güven skoru düşük olan kayıtlar kullanıcı onayına bırakılmalı. Çoktan seçmeli A–D seçenekleri bulunmayan etkinlikler açık uçlu veya etkinlik türünde taslak olarak işaretlenmeli.

Sayfalarda `Adı`, `Soyadı` ve `ilkokul1.com` gibi şablon/filigran metinleri bulunuyor. Ayrıştırma sırasında öğrenci adı-soyadı alanları ve bu alanlar gibi tekrar eden filigranlar temizlenmeli. Başlık, sınıf seviyesi ve konu bilgisi belge meta verisinden veya kullanıcı seçiminden alınmalı.

Planlanan aktarım: PDF yükleme → metin çıkarma → soru/etkinlik bloklarını ayırma → seçenek ve cevap anahtarını eşleştirme → soru türü ve güven skoru atama → toplu düzenleme/ön izleme → kullanıcı seçtiklerini soru havuzuna kaydetme.
