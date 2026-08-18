export type CurriculumEntry = {
  schoolLevel: "İlkokul" | "Ortaokul" | "Lise";
  className: `${number}. Sınıf`;
  subject: string;
  unit: string;
  outcome: string;
};

/**
 * OkulBlog’un kalıcı eğitim kategori kataloğu. Bu kayıtlar demo içerik değildir;
 * Admin tarafından yönetilen Eğitim Kategorisi ağacının başlangıç kataloğudur.
 */
export const educationCurriculum: CurriculumEntry[] = ([
  ["İlkokul", "1. Sınıf", "Türkçe", "Okuma-Yazmaya Giriş", "Harfleri tanır, sesleri ayırt eder ve heceler oluşturur."],
  ["İlkokul", "1. Sınıf", "Matematik", "Doğal Sayılar", "20’ye kadar olan nesne sayılarını belirler ve rakamla yazar."],
  ["İlkokul", "1. Sınıf", "Hayat Bilgisi", "Okulumuzda Hayat", "Sınıfının ve okulunun kurallarına uyar."],
  ["İlkokul", "2. Sınıf", "Türkçe", "Okuma Akıcılığı ve Anlama", "Noktalama işaretlerine dikkat ederek akıcı okur."],
  ["İlkokul", "2. Sınıf", "Matematik", "Sayılar ve İşlemler", "İki basamaklı sayılarla eldeli ve eldesiz toplama yapar."],
  ["İlkokul", "2. Sınıf", "Hayat Bilgisi", "Evimizde Hayat", "Evdeki kaynakları bilinçli tüketmenin önemini kavrar."],
  ["İlkokul", "3. Sınıf", "Türkçe", "Söz Varlığını Geliştirme", "Okuduğu metindeki eş anlamlı sözcükleri bulur."],
  ["İlkokul", "3. Sınıf", "Matematik", "Çarpma ve Bölme", "Üç basamaklı sayıları tek basamaklı sayılara böler."],
  ["İlkokul", "3. Sınıf", "Fen Bilimleri", "Gezegenimizi Tanıyalım", "Dünyanın katmanlardan oluştuğunu açıklar."],
  ["İlkokul", "4. Sınıf", "Türkçe", "Okuduğunu Anlama ve Çözümleme", "Metindeki ana fikir ve yardımcı fikirleri belirler."],
  ["İlkokul", "4. Sınıf", "Matematik", "Kesirler ve Ondalık Gösterim", "Paydaları eşit kesirlerle toplama ve çıkarma yapar."],
  ["İlkokul", "4. Sınıf", "Sosyal Bilgiler", "Herkesin Bir Kimliği Var", "Resmî kimlik belgesini inceleyerek unsurlarını açıklar."],
  ["Ortaokul", "5. Sınıf", "Matematik", "Kesirler, Ondalık Gösterim ve Yüzdeler", "Paydası 10, 100 veya 1000 olan kesirleri ondalık gösterimle yazar."],
  ["Ortaokul", "5. Sınıf", "Fen Bilimleri", "Güneş, Dünya ve Ay", "Güneş'in yapısını, özelliklerini ve dönme hareketini açıklar."],
  ["Ortaokul", "5. Sınıf", "Türkçe", "Bilgi Okuryazarlığı", "Medya metinlerini güvenilirlik açısından değerlendirir."],
  ["Ortaokul", "6. Sınıf", "Matematik", "Cebirsel İfadeler ve Oran", "Sözel olarak verilen bir duruma uygun cebirsel ifade yazar."],
  ["Ortaokul", "6. Sınıf", "Fen Bilimleri", "Sistemler (Destek, Hareket ve Sindirim)", "Sindirim sistemini oluşturan organların görevlerini açıklar."],
  ["Ortaokul", "6. Sınıf", "Sosyal Bilgiler", "Yeryüzünde Yaşam", "Haritalar üzerinde konum, kıta ve okyanusları ayırt eder."],
  ["Ortaokul", "7. Sınıf", "Matematik", "Eşitlik ve Denklem", "Birinci dereceden bir bilinmeyenli denklemleri çözer."],
  ["Ortaokul", "7. Sınıf", "Fen Bilimleri", "Hücre ve Bölünmeler", "Mitoz bölünmenin canlılar için önemini ve evrelerini açıklar."],
  ["Ortaokul", "7. Sınıf", "Türkçe", "Metin Türleri ve Söz Sanatları", "Metindeki abartma, benzetme ve kişileştirmeleri belirler."],
  ["Ortaokul", "8. Sınıf", "Matematik", "Veri Analizi ve Olasılık", "Sütun, çizgi ve daire grafiklerini yorumlayarak dönüşüm yapar."],
  ["Ortaokul", "8. Sınıf", "Fen Bilimleri", "DNA ve Genetik Kod", "Nükleotid, gen, DNA ve kromozom kavramlarını açıklar."],
  ["Ortaokul", "8. Sınıf", "T.C. İnkılap Tarihi", "Bir Kahraman Doğuyor", "Atatürk'ün çocukluk dönemini ve fikir hayatını etkileyen şehirleri analiz eder."],
  ["Lise", "9. Sınıf", "Matematik", "Denklem ve Eşitsizlikler", "Birinci dereceden denklem sistemlerinin çözüm kümelerini bulur."],
  ["Lise", "9. Sınıf", "Fizik", "Hareket ve Kuvvet", "Konum, alınan yol, yer değiştirme, sürat ve hız kavramlarını açıklar."],
  ["Lise", "9. Sınıf", "Türk Dili ve Edebiyatı", "Şiir Bilgisi", "Şiirin tema, kafiye, redif ve ölçü unsurlarını analiz eder."],
  ["Lise", "10. Sınıf", "Matematik", "Fonksiyonlar", "Fonksiyon kavramını açıklar ve grafik çizimlerini yapar."],
  ["Lise", "10. Sınıf", "Kimya", "Asitler, Bazlar ve Tuzlar", "Maddelerin asitlik ve bazlık özelliklerini pH ölçeğiyle yorumlar."],
  ["Lise", "10. Sınıf", "Tarih", "Beylikten Devlete Osmanlı Siyaseti", "Osmanlı Devleti'nin kuruluş sürecindeki jeopolitik konumunu analiz eder."],
  ["Lise", "11. Sınıf", "Matematik", "Trigonometri", "Trigonometrik fonksiyonların grafiklerini ve periyotlarını çözümler."],
  ["Lise", "11. Sınıf", "Biyoloji", "İnsan Fizyolojisi ve Sistemler", "Sinir sisteminin yapı, görev ve işleyiş mekanizmasını açıklar."],
  ["Lise", "11. Sınıf", "Coğrafya", "Ekosistem ve Madde Döngüsü", "Biyoçeşitliliğin oluşumu ve azalmasında etkili olan faktörleri yorumlar."],
  ["Lise", "12. Sınıf", "Matematik", "Türev ve İntegral", "Belirli integral kullanarak iki eğri arasında kalan alanı hesaplar."],
  ["Lise", "12. Sınıf", "Fizik", "Atom Fiziğine Giriş ve Radyoaktivite", "Büyük Patlama teorisini ve parçacık fiziğinin gelişimini özetler."],
  ["Lise", "12. Sınıf", "Türk Dili ve Edebiyatı", "Cumhuriyet Dönemi Saf Şiir Anlayışı", "Dönemin edebi akımlarını ve şairlerin üslup özelliklerini karşılaştırır."],
] as const).map(([schoolLevel, className, subject, unit, outcome]) => ({ schoolLevel, className, subject, unit, outcome }));
