# Google Search Console ve AI Üretim Entegrasyonu

## Google Search Console bağlantı akışı

OkulBlog’da Google Search Console için API key yerine OAuth 2.0 kullanılmalıdır. Client ID ve Client Secret Google Cloud Console’da oluşturulur; Redirect URL, Google OAuth istemcisinde ve uygulamanın sunucu ortamında aynı olmalıdır. Kullanıcı Admin panelindeki Search Console ekranından bağlantıyı başlatır, Google izin ekranında Search Console kapsamlarını onaylar ve uygulamaya callback ile döner.

Önerilen OAuth kapsamları:

- `https://www.googleapis.com/auth/webmasters.readonly`: mülkleri, arama performansını ve durumları okumak için.
- `https://www.googleapis.com/auth/webmasters`: sitemap gönderme, URL denetimi ve indeksleme istekleri gibi yazma işlemleri için.

Kod yapısı aşağıdaki katmanlardan oluşur:

| Katman | Dosya veya sorumluluk | Görev |
|---|---|---|
| UI | `client/src/pages/Panel.tsx` | Client ID, Client Secret, Redirect URL ve mülk URL’si alanlarını göstermek; bağlantı testini başlatmak |
| Router | `server/routers.ts` | Admin yetkisi, input doğrulaması, eksik alan raporu ve OAuth işlemlerinin tRPC sözleşmesi |
| OAuth yardımcıları | `server/searchConsoleProvider.ts` | Yetkilendirme URL’si, authorization code değişimi, token yenileme ve Search Console API aksiyonları |
| Ayarlar | `site_settings` / hosting environment | Client ID, Redirect URL ve mülk gibi yapılandırmalar; Client Secret ve refresh token yalnızca secret olarak |
| API aksiyonları | `buildSearchConsoleActions` | Mülk listesi, sitemap, URL inspection, indexing ve performans sorguları |

Tokenlar istemciye veya normal site ayarlarına yazılmamalıdır. Refresh token sunucu tarafında şifreli secret storage’da tutulmalı, API istekleri yalnızca Admin yetkisiyle yapılmalı ve hata mesajları token değerlerini içermemelidir. Hosting aşamasında şu değerler tanımlanmalıdır: `GOOGLE_SEARCH_CONSOLE_CLIENT_ID`, `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET`, `GOOGLE_SEARCH_CONSOLE_REDIRECT_URI` ve varsayılan mülk için `GOOGLE_SEARCH_CONSOLE_SITE_URL`.

## Gemini ve ChatGPT soru/test üretimi

AI üretimi tRPC üzerinden sunucu tarafında yapılır. `client/src/components/QuestionEditor.tsx` sağlayıcı, model, konu, sınıf seviyesi, zorluk ve Eğitim kategorisi seçimlerini gönderir. `server/routers.ts` input sözleşmesini ve Eğitim kategorisi zorunluluğunu korur. `server/aiQuestionGenerator.ts` yapılandırılmış soru ve test taslağı üretimini yönetir. `server/aiProviderConfig.ts` sağlayıcı durumunu, desteklenen modelleri ve maskeli anahtar bilgisini sunar.

Üretim akışı kaydetmeden önce taslak döndürür. Kullanıcı soru metnini, seçenekleri, doğru cevabı, açıklamayı ve testteki soru listesini düzenleyebilir; son kayıt işlemi mevcut soru/test prosedürleriyle yapılır. Sağlayıcı anahtarları istemciye gönderilmez. `OPENAI_API_KEY` ve `GEMINI_API_KEY` hosting sonrasında tanımlandığında bağlantı testleri ve gerçek sağlayıcı çağrıları çalıştırılmalıdır.

## Hosting sonrası kontrol listesi

1. Google OAuth Client ID ve Secret oluşturulup Redirect URL ile eşleştirilir.
2. Search Console mülkü doğrulanır ve gerekli OAuth kapsamları etkinleştirilir.
3. `OPENAI_API_KEY` ve `GEMINI_API_KEY` secret alanlarına girilir.
4. Admin panelinden Search Console ve AI sağlayıcı bağlantı testleri çalıştırılır.
5. Test ortamında bir soru ve bir test taslağı üretilir; kaydetmeden önce düzenlenir.
6. Gerçek mülk üzerinde sitemap, performans ve URL inspection işlemleri sınırlı bir Admin hesabıyla doğrulanır.
