# OkulBlog Canlı Kurulum Kılavuzu

Bu paket iki dağıtım modelini destekler. **Senaryo A**, statik React frontend’in PHP/Vercel üzerinde, Express+tRPC backend’in ise Node.js destekleyen bir platformda çalıştığı ayrık mimaridir. **Senaryo B**, React derlemesini de sunan Express uygulaması ile MySQL’in aynı Ubuntu VPS üzerinde Docker Compose aracılığıyla çalıştığı tek sunucu mimarisidir.

> Önemli: PHP hosting tek başına OkulBlog backend’ini çalıştıramaz. PHP sunucusu yalnızca `pnpm build:frontend` çıktısını barındırabilir; tRPC, OAuth, Drizzle ve dosya işlemleri için ayrı bir Node.js backend gerekir.

## Dosyalar

| Dosya | Kullanım amacı |
|---|---|
| `deploy/scenario-a/frontend.env.example` | Vercel/PHP frontend derleme değişkenleri |
| `deploy/scenario-a/backend.env.example` | Railway/Render Node API değişkenleri |
| `deploy/scenario-a/vercel.json` | Vercel SPA fallback ve asset cache |
| `deploy/scenario-a/render.yaml` | Render backend servis örneği |
| `deploy/scenario-a/php/.htaccess` | Apache/PHP hosting SPA fallback |
| `deploy/scenario-b/vps.env.template` | VPS `.env` oluşturmak için güvenli şablon |
| `deploy/scenario-b/docker-compose.yml` | OkulBlog + MySQL servisleri |
| `Dockerfile` | Tek sunucu production image’ı |

## Senaryo A: PHP/Vercel frontend + Node.js backend

Önce backend için yönetilen MySQL/TiDB veritabanı oluşturun. Ardından Node platformunda proje kökünü deploy edin ve aşağıdaki komutları kullanın:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run build:backend
NODE_ENV=production node dist/backend/index.js
```

Platform `PORT` değerini kendisi verebilir; uygulama bu değeri `process.env.PORT` üzerinden kullanır. Render kullanılıyorsa `deploy/scenario-a/render.yaml` başlangıç noktasıdır. Railway’de aynı build/start komutlarını servis ayarlarına girin. Backend’in herkese açık adresi örneğin `https://api.example.com` olduktan sonra frontend derlemesinde `VITE_API_BASE_URL=https://api.example.com` tanımlayın.

Frontend için:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run build:frontend
```

Çıktı `dist/frontend/` klasörüdür. Vercel’de output directory olarak `dist/frontend`, build command olarak `corepack pnpm run build:frontend` seçilebilir. PHP/Apache hosting’de bu klasörün içeriğini `public_html` veya ilgili document root’a yükleyin ve `deploy/scenario-a/php/.htaccess` dosyasını aynı köke kopyalayın. `VITE_API_BASE_URL` backend adresini göstermelidir.

Frontend ve backend farklı origin’lerdeyse backend üzerinde production frontend origin’i için CORS ve cookie ayarlarını platformun reverse proxy/domain yapısına göre ayrıca doğrulayın. OAuth callback ve cookie domain’i gerçek alan adlarıyla eşleşmelidir. API adresi HTTPS olmalı; HTTP kullanmayın.

## Senaryo B: Ubuntu VPS + Docker Compose

Ubuntu VPS üzerinde Docker Engine ve Compose Plugin kurulduktan sonra proje dosyalarını sunucuya aktarın. Proje kökünde `deploy/scenario-b/vps.env.template` dosyasını `.env` olarak kopyalayın ve tüm `replace-with-*` değerlerini değiştirin:

```bash
cp deploy/scenario-b/vps.env.template .env
chmod 600 .env
nano .env
```

Tek sunucu mimarisinde `VITE_API_BASE_URL` boş bırakılır; frontend `/api/trpc` yolunu aynı origin üzerinden kullanır. Compose servislerini şu şekilde başlatın:

```bash
docker compose -f deploy/scenario-b/docker-compose.yml --env-file .env up -d --build

docker compose -f deploy/scenario-b/docker-compose.yml ps
docker compose -f deploy/scenario-b/docker-compose.yml logs -f app
```

Uygulama varsayılan olarak VPS’in `3000` portunda yayınlanır. İnternet erişimi için Nginx veya Caddy reverse proxy kullanarak `https://okulblog.example.com` adresini container’a yönlendirin. TLS sertifikası reverse proxy katmanında sonlandırılmalıdır; 3000 portunu doğrudan internete açmak yerine yalnızca reverse proxy’den erişilebilir tutmak daha güvenlidir.

İlk açılıştan sonra `/`, `/robots.txt`, `/sitemap.xml` ve `/api/trpc/auth.me` yollarını kontrol edin. OAuth sağlayıcısındaki callback adresi gerçek alan adına göre güncellenmelidir. MySQL verisi `okulblog_mysql` adlı Docker volume içinde tutulur; bu volume’ün düzenli yedeğini harici depolamaya alın.

## Environment variable referansı

| Değişken | Zorunluluk | Nerede kullanılır | Açıklama |
|---|---:|---|---|
| `NODE_ENV` | Evet | Backend/VPS | Production’da `production` |
| `PORT` | Platforma bağlı | Backend | Node servis portu; hardcode edilmemelidir |
| `DATABASE_URL` | Evet | Backend | MySQL/TiDB bağlantı URI’si |
| `JWT_SECRET` | Evet | Backend | Oturum imzalama; uzun ve rastgele olmalı |
| `VITE_APP_ID` | Evet | Backend/frontend build | OAuth uygulama kimliği |
| `OAUTH_SERVER_URL` | Evet | Backend | OAuth sunucu adresi |
| `VITE_OAUTH_PORTAL_URL` | Evet | Frontend build | Kullanıcı login portalı |
| `OWNER_OPEN_ID` | Evet | Backend | Proje sahibi hesabı |
| `OWNER_NAME` | Evet | Backend | Proje sahibi görünen adı |
| `BUILT_IN_FORGE_API_URL` | Gerektiğinde | Backend | Dahili AI/storage/notification API adresi |
| `BUILT_IN_FORGE_API_KEY` | Gerektiğinde | Backend | Sunucu tarafı dahili API anahtarı |
| `VITE_APP_TITLE` | Önerilir | Frontend build | Site başlığı |
| `VITE_APP_LOGO` | İsteğe bağlı | Frontend build | Logo URL’si |
| `VITE_ANALYTICS_ENDPOINT` | İsteğe bağlı | Frontend build | Analitik endpoint’i |
| `VITE_ANALYTICS_WEBSITE_ID` | İsteğe bağlı | Frontend build | Analitik site kimliği |
| `VITE_API_BASE_URL` | Senaryo A’da evet | Frontend build | Ayrı backend adresi; Senaryo B’de boş |
| `MYSQL_DATABASE` | VPS’de evet | MySQL/Compose | Veritabanı adı |
| `MYSQL_USER` | VPS’de evet | MySQL/Compose | Uygulama DB kullanıcısı |
| `MYSQL_PASSWORD` | VPS’de evet | MySQL/Compose | Uygulama DB parolası |
| `MYSQL_ROOT_PASSWORD` | VPS’de evet | MySQL/Compose | MySQL root parolası |

Google OAuth Client Secret, Search Console tokenları, AdSense Publisher ID, Gemini/OpenAI anahtarları, Bunny.net anahtarları ve S3 erişim bilgileri frontend’e veya Dockerfile’a yazılmamalıdır. Bunlar backend secret store’da veya Admin > Integration Settings alanında mevcut AES-256-GCM akışıyla yönetilmelidir.

## Güvenlik ve operasyon kontrolü

Production secret dosyalarını Git’e göndermeyin; `.env` dosyasına `chmod 600` uygulayın. MySQL portunu internete açmayın. Reverse proxy üzerinde HTTPS, güvenli cookie ve doğru CORS origin’i etkinleştirin. Veritabanı volume’ünü yedeklemeden migration veya destructive SQL çalıştırmayın. Uygulama loglarında JWT, OAuth secret, API key veya `DATABASE_URL` yazdırılmadığını kontrol edin.

İlk canlı doğrulama tamamlandıktan sonra Admin entegrasyon ayarlarına gerçek Google, Search Console, AdSense, AI ve depolama değerlerini girin. Ardından bir test içeriği oluşturup sitemap güncellemesini, indeksleme kuyruğunu, dosya yüklemeyi ve mobil görünümü gerçek alan adında kontrol edin.

## Sınırlamalar ve tercih önerisi

Senaryo A, PHP hosting zaten mevcutsa frontend maliyetini azaltır; ancak iki ayrı deployment, CORS, OAuth callback ve iki ayrı log/secret yönetimi gerektirir. Senaryo B, tek VPS üzerinde daha bütünlüklü ve taşınabilir bir kurulum sağlar; bunun karşılığında işletim sistemi güncellemeleri, firewall, TLS, yedekleme ve Docker operasyonları sizin sorumluluğunuzdadır. Trafik büyüdüğünde MySQL’i uygulama container’ından ayrı yönetilen bir veritabanına taşımak daha dayanıklı olabilir.
