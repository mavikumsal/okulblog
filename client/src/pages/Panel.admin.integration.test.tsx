// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { panelState, hook } = vi.hoisted(() => {
  const state = { route: "/panel/ayarlar", userRole: "admin", testList: [] as unknown[], mediaLinks: [{ id: 12, mediaAssetId: 4, targetType: "content", targetId: 21, role: "cover" }], providerMutate: vi.fn(), unlinkMutate: vi.fn(), adsenseMutate: vi.fn(), mediaAssetsState: { data: [{ id: 4, fileName: "kapak.pdf", provider: "s3", status: "active", folderPath: "Kapaklar" }, { id: 5, fileName: "turkce.pdf", provider: "bunny-storage", status: "active", folderPath: "Dersler/Türkçe" }], isLoading: false, isError: false }, settingsState: { data: [{ settingKey: "seo_description", settingValue: "OkulBlog eğitim platformu" }], isLoading: false, isError: false } };
  const makeQuery = (data: unknown, extra: Record<string, unknown> = {}) => ({ data, isLoading: false, isError: false, ...extra });
  const makeHook = (data: unknown = []) => ({ useQuery: () => makeQuery(typeof data === "function" ? data() : data), useMutation: () => ({ isPending: false, mutate: vi.fn() }) });
  return { panelState: state, hook: makeHook };
});

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: panelState.userRole, name: panelState.userRole === "admin" ? "Admin" : "Üye" } }) }));
vi.mock("wouter", () => ({ useLocation: () => [panelState.route, vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => new Proxy({}, { get: () => new Proxy({}, { get: () => ({ invalidate: vi.fn() }) }) }),
    panel: { accessibleSections: hook(["Ayarlar", "Testler"]) },
    platform: { overview: hook({ content: [], educationCategories: [] }) },
    permissions: { forRole: hook([]), update: hook() },
    categories: { list: hook([]), create: hook(), setInstitutionStatus: hook(), update: hook(), setStatus: hook() },
    questions: { list: hook([]), create: hook() },
    ai: { generateQuestion: hook(), generateTest: hook() },
    contents: { list: hook([]), create: hook(), archive: hook() },
    tests: { list: hook(() => panelState.testList), create: hook() },
    admin: { users: hook([]), updateUserRole: hook(), settings: { useQuery: () => panelState.settingsState }, searchConsoleStatus: hook({ configured: false, propertyUrl: null, verificationStatus: "not_configured", sitemapStatus: "not_configured", lastError: null }), testProviderConnection: { useMutation: () => ({ isPending: false, mutate: panelState.providerMutate }) }, mediaAssets: { useQuery: () => panelState.mediaAssetsState }, mediaTransferJobs: hook([]), createMediaAsset: hook(), uploadMediaAsset: hook(), archiveMediaAsset: hook(), createMediaTransferJob: hook(), retryMediaTransferJob: hook(), cancelMediaTransferJob: hook(), linkMediaAsset: hook(), mediaAssetLinks: hook(() => panelState.mediaLinks), unlinkMediaAsset: { useMutation: () => ({ isPending: false, mutate: panelState.unlinkMutate }) }, saveSetting: { useMutation: () => ({ isPending: false, mutate: panelState.adsenseMutate }) }, newsCategories: hook([]), createNewsCategory: hook(), homeSlides: hook([]), createHomeSlide: hook(), updateHomeSlide: hook(), deleteHomeSlide: hook(), popularEducationCategories: hook({ selectedIds: [], available: [] }), savePopularEducationCategories: hook() },
    security: { list: hook([]) },
  },
}));

import Panel from "./Panel";

describe("Panel Admin modülleri component akışları", () => {
  afterEach(() => { cleanup(); panelState.userRole = "admin"; panelState.route = "/panel/ayarlar"; panelState.providerMutate.mockReset(); panelState.unlinkMutate.mockReset(); panelState.adsenseMutate.mockReset(); panelState.mediaAssetsState = { data: [{ id: 4, fileName: "kapak.pdf", provider: "s3", status: "active", folderPath: "Kapaklar" }, { id: 5, fileName: "turkce.pdf", provider: "bunny-storage", status: "active", folderPath: "Dersler/Türkçe" }], isLoading: false, isError: false }; panelState.settingsState = { data: [{ settingKey: "seo_description", settingValue: "OkulBlog eğitim platformu" }], isLoading: false, isError: false }; });

  it("ayarlar görünümünde izin, SEO, Search Console, reklam ve site haritası alanlarını gösterir", () => {
    panelState.route = "/panel/ayarlar";
    render(<Panel />);
    expect(screen.getByText("Panel izinleri")).toBeInTheDocument();
    expect(screen.getByText("SEO ve Google Search Console")).toBeInTheDocument();
    expect(screen.getByText("Reklam Alanı")).toBeInTheDocument();
    expect(screen.getByText("Site haritası önizlemesi")).toBeInTheDocument();
  });

  it("provider test butonu doğru AdSense sağlayıcı anahtarını gönderir", () => {
    panelState.route = "/panel/reklam";
    render(<Panel />);
    fireEvent.click(screen.getAllByRole("button", { name: "Bağlantıyı test et" })[0]);
    expect(panelState.providerMutate).toHaveBeenCalledWith({ provider: "adsense" });
  });

  it("Bulut Depolama formunda Bunny API key ve Storage Zone alanlarını test mutationına gönderir", () => {
    panelState.route = "/panel/bulut-depolama";
    render(<Panel />);
    fireEvent.change(screen.getByRole("combobox", { name: "Depolama sağlayıcısı" }), { target: { value: "bunny-storage" } });
    fireEvent.change(screen.getByLabelText("Bunny API Key"), { target: { value: "bunny-secret" } });
    fireEvent.change(screen.getByLabelText("Storage Zone adı"), { target: { value: "okulblog-media" } });
    fireEvent.click(screen.getByRole("button", { name: "Alanları test et" }));
    expect(panelState.providerMutate).toHaveBeenCalledWith(expect.objectContaining({ provider: "bunny-storage", config: expect.objectContaining({ apiKey: "bunny-secret", storageZone: "okulblog-media" }) }));
  });

  it("Bulut Depolama formunda Bunny CDN Pull Zone alanlarını test mutationına gönderir", () => {
    panelState.route = "/panel/bulut-depolama";
    render(<Panel />);
    fireEvent.change(screen.getByRole("combobox", { name: "Depolama sağlayıcısı" }), { target: { value: "bunny-pull-zone" } });
    fireEvent.change(screen.getByLabelText("Bunny API Key"), { target: { value: "pull-secret" } });
    fireEvent.change(screen.getByLabelText("Pull Zone ID"), { target: { value: "123456" } });
    fireEvent.change(screen.getByLabelText("CDN hostname"), { target: { value: "cdn.example.b-cdn.net" } });
    fireEvent.change(screen.getByLabelText("Origin URL"), { target: { value: "https://origin.example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Alanları test et" }));
    expect(panelState.providerMutate).toHaveBeenCalledWith(expect.objectContaining({ provider: "bunny-pull-zone", config: expect.objectContaining({ apiKey: "pull-secret", pullZoneId: "123456", cdnHostname: "cdn.example.b-cdn.net", originUrl: "https://origin.example.com" }) }));
  });

  it("Bulut Depolama, Reklam Alanı ve Search Console route’larında yapılandırma durumunu gösterir", () => {
    const cases = [
      { route: "/panel/bulut-depolama", title: "Bulut Depolama", provider: "Google Drive · Kişisel hesap" },
      { route: "/panel/reklam", title: "Reklam Alanı", provider: "Google AdSense · Yayıncı ve slot ayarları" },
      { route: "/panel/search-console", title: "Google Search Console", provider: "Mülk bağlantısı ve doğrulama" },
    ];
    for (const item of cases) {
      panelState.route = item.route;
      const { unmount } = render(<Panel />);
      expect(screen.getByText(item.title)).toBeInTheDocument();
      expect(screen.getByText(item.route === "/panel/bulut-depolama" ? "1/7 hazır" : "Yapılandırılmadı")).toBeInTheDocument();
      expect(screen.getByText(item.provider)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Bağlantıyı test et" }).length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("non-admin kullanıcıda Bulut Depolama, Reklam ve Search Console erişimini kısıtlar", () => {
    panelState.userRole = "member";
    for (const route of ["/panel/bulut-depolama", "/panel/reklam", "/panel/search-console"]) {
      panelState.route = route;
      const { unmount } = render(<Panel />);
      expect(screen.getByText("Bu modül size açık değil. Admin, panel izinleri bölümünden erişimi açabilir.")).toBeInTheDocument();
      expect(screen.queryByText("Bağlantı merkezi")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("Reklam route’unda AdSense slotu ve özel kampanya alanlarını gösterir", () => {
    panelState.route = "/panel/reklam";
    render(<Panel />);
    expect(screen.getByText("AdSense Türkiye")).toBeInTheDocument();
    expect(screen.getByLabelText("AdSense yayıncı kimliği")).toBeInTheDocument();
    expect(screen.getByLabelText("AdSense reklam slotu")).toBeInTheDocument();
    expect(screen.getByLabelText("Reklamveren")).toBeInTheDocument();
    expect(screen.getByLabelText("Kampanya tarih aralığı")).toBeInTheDocument();
    expect(screen.getByLabelText("AdSense reklam kodu")).toBeInTheDocument();
    expect(screen.getByLabelText("Reklam medya varlığı")).toBeInTheDocument();
    expect(screen.getByText("Görsel/video medya varlığı bulunamadı; önce Medya Merkezi’nden yükleyin.")).toBeInTheDocument();
    expect(screen.getByLabelText("Reklam sırası")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "AdSense yönetimine git" })).toHaveAttribute("href", "https://adsense.google.com/intl/tr_tr/start/");
    expect(screen.getByRole("button", { name: "AdSense ayarlarını kaydet" })).toBeDisabled();
    expect(screen.getByTestId("ad-config-grid")).toHaveClass("lg:grid-cols-2");
  });

  it("reklam medya sorgusu hata verdiğinde anlaşılır hata durumu gösterir", () => {
    panelState.route = "/panel/reklam";
    panelState.mediaAssetsState = { data: [], isLoading: false, isError: true };
    render(<Panel />);
    expect(screen.getByText("Reklam medya varlıkları yüklenemedi.")).toBeInTheDocument();
  });

  it("geçerli AdSense kimlikleri ve koduyla saveSetting mutationına yapılandırmayı gönderir", () => {
    panelState.route = "/panel/reklam";
    render(<Panel />);
    fireEvent.change(screen.getByLabelText("AdSense yayıncı kimliği"), { target: { value: "ca-pub-123456" } });
    fireEvent.change(screen.getByLabelText("AdSense reklam slotu"), { target: { value: "1234567890" } });
    fireEvent.change(screen.getByLabelText("AdSense reklam kodu"), { target: { value: "pagead2.googlesyndication.com/ad.js" } });
    fireEvent.click(screen.getByRole("button", { name: "AdSense ayarlarını kaydet" }));
    expect(panelState.adsenseMutate).toHaveBeenCalledWith(expect.objectContaining({ settingKey: "adsense_config" }));
  });

  it("Search Console status sözleşmesindeki mülk, doğrulama, sitemap ve hata kartlarını gösterir", () => {
    panelState.route = "/panel/search-console";
    render(<Panel />);
    expect(screen.getByText("Search Console durumu")).toBeInTheDocument();
    expect(screen.getByText("Henüz eklenmedi")).toBeInTheDocument();
    expect(screen.getAllByText("not_configured").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Hata kaydı yok")).toBeInTheDocument();
  });

  it("Bulut Depolama S3 dosya seçimi ve klasör metadata alanını gösterir", () => {
    panelState.route = "/panel/bulut-depolama";
    render(<Panel />);
    expect(screen.getByLabelText("S3 dosyası seç")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Klasör yolu" })).toBeInTheDocument();
  });

  it("Bulut Depolama gerçek medya metadata kayıt formunu gösterir", () => {
    panelState.route = "/panel/bulut-depolama";
    render(<Panel />);
    expect(screen.getByText("Dosya metadata’sı ekle")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("örnek-dokuman.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Medya kaydını oluştur" })).toBeDisabled();
  });

  it("İstatistikler ve ortak provider formu Analytics, YouTube ve video kaynak alanlarını gösterir", () => {
    panelState.route = "/panel/istatistikler";
    render(<Panel />);
    expect(screen.getAllByText("Google Analytics / İstatistik").length).toBeGreaterThanOrEqual(1);
    const providerSelect = screen.getByRole("combobox", { name: "Depolama sağlayıcısı" });
    fireEvent.change(providerSelect, { target: { value: "google-analytics" } });
    expect(screen.getByLabelText("Google Analytics Measurement ID")).toBeInTheDocument();
    expect(screen.getByLabelText("Analytics Property ID")).toBeInTheDocument();
    expect(screen.getByLabelText("Analytics API endpoint")).toBeInTheDocument();
    fireEvent.change(providerSelect, { target: { value: "youtube" } });
    expect(screen.getByLabelText("YouTube Data API key")).toBeInTheDocument();
    expect(screen.getByLabelText("Kanal ID")).toBeInTheDocument();
    fireEvent.change(providerSelect, { target: { value: "video-source" } });
    expect(screen.getByLabelText("Video adresi")).toBeInTheDocument();
    expect(screen.getByLabelText("Embed adresi")).toBeInTheDocument();
  });

  it("Videolar route’unda YouTube ve video kaynak bağlantı merkezini gösterir", () => {
    panelState.route = "/panel/videolar";
    render(<Panel />);
    expect(screen.getByText("YouTube ve Video Kaynakları")).toBeInTheDocument();
    const providerSelect = screen.getByRole("combobox", { name: "Depolama sağlayıcısı" });
    fireEvent.change(providerSelect, { target: { value: "youtube" } });
    expect(screen.getByLabelText("YouTube Data API key")).toBeInTheDocument();
    expect(screen.getByLabelText("Kanal ID")).toBeInTheDocument();
    fireEvent.change(providerSelect, { target: { value: "video-source" } });
    expect(screen.getByLabelText("Video adresi")).toBeInTheDocument();
    expect(screen.getByLabelText("Embed adresi")).toBeInTheDocument();
  });

  it("Medya Merkezi klasör yolunu gösterir ve klasör filtresiyle kayıtları daraltır", () => {
    panelState.route = "/panel/bulut-depolama";
    render(<Panel />);
    expect(screen.getByText("Klasör: Kapaklar")).toBeInTheDocument();
    expect(screen.getByText("Klasör: Dersler/Türkçe")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Klasör filtresi" }), { target: { value: "Dersler/Türkçe" } });
    expect(screen.queryByText("kapak.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("turkce.pdf")).toBeInTheDocument();
  });

  it("Medya entegrasyonlarında yükleniyor ve hata durumlarını gösterir", () => {
    panelState.route = "/panel/bulut-depolama";
    panelState.settingsState = { data: [], isLoading: true, isError: false };
    const { unmount } = render(<Panel />);
    expect(screen.getByText("Dosyalarınızı sağlayıcılar arasında yönetin.")).toBeInTheDocument();
    expect(screen.queryByText("Yapılandırılmadı")).not.toBeInTheDocument();
    unmount();

    panelState.route = "/panel/search-console";
    panelState.settingsState = { data: [], isLoading: false, isError: true };
    render(<Panel />);
    expect(screen.getByText("Bağlantı ayarları yüklenemedi.")).toBeInTheDocument();
    panelState.settingsState = { data: [{ settingKey: "seo_description", settingValue: "OkulBlog eğitim platformu" }], isLoading: false, isError: false };
  });

  it("güvenlik ve istatistik ekranlarının boş durumlarını gösterir", () => {
    panelState.route = "/panel/guvenlik";
    const { unmount } = render(<Panel />);
    expect(screen.getByText("Güvenlik Olayları")).toBeInTheDocument();
    expect(screen.getByText("Henüz kayıtlı güvenlik olayı yok.")).toBeInTheDocument();
    unmount();

    panelState.route = "/panel/istatistikler";
    render(<Panel />);
    expect(screen.getByText("Kayıtlı üye")).toBeInTheDocument();
    expect(screen.getByText("Güvenlik kaydı")).toBeInTheDocument();
  });

  it("İçerik medya link/unlink akışında provider etiketini ve bağlantı kimliğini doğrular", () => {
    panelState.route = "/panel/dokumanlar";
    render(<Panel />);
    fireEvent.change(screen.getByPlaceholderText("İçerik ID"), { target: { value: "21" } });
    expect(screen.getByText("kapak.pdf")).toBeInTheDocument();
    expect(screen.getByText(/S3 · cover/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bağlantıyı kaldır" }));
    expect(panelState.unlinkMutate).toHaveBeenCalledWith({ id: 12 });
  });

  it("Testler ekranında gerçek test metadata’sını listede gösterir", () => {
    panelState.route = "/panel/testler";
    panelState.testList = [{ id: 9, title: "Türkçe kazanım testi", description: "İlk deneme", questionIds: [1, 2, 3], status: "draft" }];
    render(<Panel />);
    expect(screen.getByText("Oluşturulan testler")).toBeInTheDocument();
    expect(screen.getByText("Türkçe kazanım testi")).toBeInTheDocument();
    expect(screen.getByText(/İlk deneme · 3 soru/)).toBeInTheDocument();
  });
  it("soru editöründe rich text, görsel ön izleme, A-D cevapları ve AI aktarım alanını gösterir", () => {
    panelState.route = "/panel/soru-havuzu";
    render(<Panel />);
    expect(screen.getByTestId("question-rich-editor")).toBeInTheDocument();
    expect(screen.getByTestId("answer-rich-editor")).toBeInTheDocument();
    expect(screen.getByLabelText(/Soru görseli/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cevap görseli/)).toBeInTheDocument();
    expect(screen.getByLabelText("A seçeneği")).toBeInTheDocument();
    expect(screen.getByLabelText("D seçeneği")).toBeInTheDocument();
    expect(screen.getByLabelText("AI konu")).toBeInTheDocument();
    expect(screen.getByLabelText("AI test başlığı")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Öğrenci ön izlemesi/ })).toBeInTheDocument();
    expect(screen.getByLabelText("AI soru sayısı")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Test üret" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Seçenek ekle/ })).toBeInTheDocument();
  });
  it("soru editöründe seçenek çoğaltma, silme ve çoklu forma geçişi çalışır", () => {
    panelState.route = "/panel/soru-havuzu";
    render(<Panel />);
    fireEvent.click(screen.getByRole("button", { name: /Seçenek ekle/ }));
    expect(screen.getByLabelText("E seçeneği")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Sil" })[4]);
    expect(screen.queryByLabelText("E seçeneği")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Çoklu soru" }));
    expect(screen.getByTestId("bulk-question-editor-0")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-question-editor-1")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-answer-editor-0")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /AI doldur/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Ön izle/ })).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Çoklu soruları taslak ekle/ })).toBeInTheDocument();
  });
});
