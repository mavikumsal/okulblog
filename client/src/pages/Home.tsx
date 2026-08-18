import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { QuestionProductionDashboard } from "@/components/QuestionProductionDashboard";
import { trpc } from "@/lib/trpc";
import { getHomeLoaderDelay } from "@/lib/homeLoading";
import { getHomeAccountLabel, getHomePrimaryLabel } from "@shared/homeNavigation";
import {
  ArrowDownRight,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  FileText,
  Gamepad2,
  GraduationCap,
  Layers3,
  Menu,
  MessageCircle,
  Megaphone,
  PlayCircle,
  Search,
  Sparkles,
  Target,
  Video,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const contentAreas = [
  { name: "Testler", detail: "Ölçme ve değerlendirme", path: "/panel/testler", icon: Target, accent: "bg-[#e7b354]", ink: "text-[#7b4d0e]" },
  { name: "Dokümanlar", detail: "Düzenli kaynak arşivi", path: "/panel/dokumanlar", icon: FileText, accent: "bg-[#b8ddd4]", ink: "text-[#155d55]" },
  { name: "Simülasyonlar", detail: "Görerek ve deneyerek öğren", path: "/panel/simulasyonlar", icon: Layers3, accent: "bg-[#d8c8e8]", ink: "text-[#60447a]" },
  { name: "Videolar", detail: "Odaklı anlatımlar", path: "/panel/videolar", icon: Video, accent: "bg-[#f3c7bd]", ink: "text-[#873d31]" },
  { name: "Oyunlar", detail: "Aktif tekrar deneyimi", path: "/panel/oyunlar", icon: Gamepad2, accent: "bg-[#bcd5ee]", ink: "text-[#24567b]" },
  { name: "Haberler", detail: "Eğitimden seçili gündem", path: "/panel/haberler", icon: BookOpen, accent: "bg-[#d6dfad]", ink: "text-[#536a1d]" },
];

const steps = [
  ["01", "Yolunu seç", "Sınıf, ders, ünite veya kurum sınavı odağını belirle."],
  ["02", "Doğru içeriğe gir", "Testler, dokümanlar ve diğer öğrenme araçlarına ulaş."],
  ["03", "Çalışmanı sürdür", "Tekrarla, ölç, geri dön ve hedefini görünür tut."],
];

function HomeLoadingScreen() {
  return (
    <div className="home-loader fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-gradient-to-br from-[#1f5fe8] via-[#3f35c4] to-[#6322a0] text-white" role="status" aria-live="polite" aria-label="OkulBlog yükleniyor">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(242,200,102,.45)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="loader-orbit relative mb-8 h-36 w-36" aria-hidden="true">
          <div className="absolute inset-5 rounded-[30px] bg-[#ffd21a] shadow-[0_20px_45px_rgba(0,0,0,.22)] [transform:rotateX(58deg) rotateZ(45deg)]" />
          <div className="absolute inset-8 rounded-[22px] bg-[#f7f4ed] shadow-[inset_-8px_-8px_0_rgba(16,46,73,.12),0_15px_30px_rgba(0,0,0,.18)] [transform:translateZ(26px) rotateX(58deg) rotateZ(45deg)]" />
          <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#b8ddd4] shadow-[0_0_0_8px_rgba(184,221,212,.16),0_10px_20px_rgba(0,0,0,.2)]" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[.28em] text-[#f2c866]">OkulBlog</p>
        <p className="mt-3 text-lg font-semibold tracking-[-.02em] text-white">Öğrenme alanın hazırlanıyor</p>
        <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
          <span className="loader-dot h-2 w-2 rounded-full bg-[#f2c866]" />
          <span className="loader-dot h-2 w-2 rounded-full bg-[#b8ddd4] [animation-delay:120ms]" />
          <span className="loader-dot h-2 w-2 rounded-full bg-[#d8c8e8] [animation-delay:240ms]" />
        </div>
      </div>
    </div>
  );
}

function getSlideNavigation(link: string | null | undefined) {
  const target = (link ?? "#icerikler").trim() || "#icerikler";
  if (target.startsWith("#")) return { kind: "anchor" as const, target };
  if (target.startsWith("/")) return { kind: "internal" as const, target };
  return { kind: "external" as const, target };
}

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [loaderStartedAt] = useState(() => Date.now());
  const [showLoader, setShowLoader] = useState(true);
  const [, setLocation] = useLocation();
  const homeSlides = trpc.platform.homeSlides.useQuery();
  const overview = trpc.platform.overview.useQuery();
  const popularEducationCategories = trpc.platform.popularEducationCategories.useQuery();
  const siteContact = (trpc.platform as any).siteContact?.useQuery ? (trpc.platform as any).siteContact.useQuery() : { data: undefined, isLoading: false };
  const qaPreview = (trpc.platform as any).qa?.list?.useQuery ? (trpc.platform as any).qa.list.useQuery() : { data: undefined, isLoading: false };
  const educationCategories = overview.data?.educationCategories ?? [];
  const configuredPopularCategories = popularEducationCategories.data ?? [];
  const displayedEducationCategories = configuredPopularCategories;
  const featuredContent = (overview.data?.content ?? []).filter(item => item.status === "published" || item.status === "pending").slice(0, 6);
  const referenceSubjects = [{ id: -1, name: "Türkçe", level: "Ders kaynakları" }, { id: -2, name: "Matematik", level: "Problem ve işlem çalışmaları" }, { id: -3, name: "Fen Bilimleri", level: "Bilim ve keşif içerikleri" }, { id: -4, name: "Sosyal Bilgiler", level: "Tarih ve toplum çalışmaları" }, { id: -5, name: "İngilizce", level: "Dil ve kelime çalışmaları" }, { id: -6, name: "Diğer Dersler", level: "Sanat, müzik ve beden" }];
  const subjectCards = displayedEducationCategories.length ? displayedEducationCategories.slice(0, 6) : (educationCategories.length ? educationCategories.slice(0, 6) : referenceSubjects);
  const newsItems = (overview.data?.content ?? []).filter(item => item.contentType === "news" && (item.status === "published" || item.status === "pending")).slice(0, 3);
  const categoryNameById = new Map([...(overview.data?.educationCategories ?? []), ...(overview.data?.institutionCategories ?? [])].map(item => [item.id, item.name]));
  const selectedCategory = educationCategories.find(category => category.id === selectedCategoryId);
  const filteredContent = trpc.platform.contentByCategory.useQuery(
    { categoryId: selectedCategoryId ?? 1 },
    { enabled: selectedCategoryId !== null }
  );
  const configuredSlides = homeSlides.data ?? [];
  const pageReady = !loading && !homeSlides.isLoading && !overview.isLoading && !popularEducationCategories.isLoading;

  useEffect(() => {
    if (!pageReady) return;
    const delay = getHomeLoaderDelay(loaderStartedAt, Date.now());
    const timer = window.setTimeout(() => setShowLoader(false), delay);
    return () => window.clearTimeout(timer);
  }, [loaderStartedAt, pageReady]);
  const fallbackSlide = {
    eyebrow: "Eğitim için düzenli bir alan",
    title: "Aradığın içerik, doğru öğrenme bağlamında.",
    description: "OkulBlog; testleri, dokümanları, simülasyonları ve sınav çalışmalarını tek bir eğitim düzeninde bir araya getirir.",
    buttonLabel: "İçerikleri keşfet",
    buttonLink: "#icerikler",
  };
  const currentSlide = configuredSlides[activeSlideIndex] ?? fallbackSlide;

  useEffect(() => {
    if (activeSlideIndex >= configuredSlides.length && configuredSlides.length) setActiveSlideIndex(0);
  }, [activeSlideIndex, configuredSlides.length]);

  useEffect(() => {
    if (configuredSlides.length < 2) return;
    const timer = window.setInterval(() => setActiveSlideIndex(index => (index + 1) % configuredSlides.length), 6000);
    return () => window.clearInterval(timer);
  }, [configuredSlides.length]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return goTo("icerikler");
    setLocation(`/panel/icerikler?search=${encodeURIComponent(query)}`);
  };

  const goTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const openPanel = () => setLocation("/panel");
  const accountAction = () => (isAuthenticated ? openPanel() : startLogin());
  const followSlideLink = () => {
    const destination = getSlideNavigation(currentSlide.buttonLink);
    if (destination.kind === "anchor") return goTo(destination.target);
    if (destination.kind === "internal") return setLocation(destination.target);
    window.open(destination.target, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {showLoader && <HomeLoadingScreen />}
      <div className="min-h-screen overflow-x-hidden bg-white text-[#111827]">
      <header className="sticky top-0 z-50 border-b border-[#eef0f5] bg-white/95 backdrop-blur-xl">
        <div className="container flex h-[76px] items-center justify-between gap-5">
          <button onClick={() => goTo("baslangic")} className="flex items-center gap-2.5 text-left" aria-label="OkulBlog ana sayfa">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#5540e8] text-white shadow-[0_9px_20px_rgba(85,64,232,.22)]"><GraduationCap size={21} /></span>
            <span className="text-[21px] font-bold tracking-[-.06em] text-[#5540e8]">okul<span className="font-serif text-[#7c3aed]">blog</span></span>
          </button>

            <form onSubmit={submitSearch} className="hidden min-w-0 flex-1 max-w-[430px] lg:block" role="search">
              <label className="relative block">
                <span className="sr-only">İçerik ara</span>
                <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Hangi testi veya konuyu arıyorsun?" className="h-11 w-full rounded-2xl border-0 bg-[#eef0eb] pl-11 pr-4 text-sm font-medium text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#5540e8]" />
                <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6e8984]" />
              </label>
            </form>
            <nav className="hidden items-center gap-5 text-sm font-bold text-[#374151] xl:flex">
              <button onClick={() => goTo("icerikler")} className="transition-colors hover:text-[#5540e8]">İçerikler</button>
              <button onClick={() => goTo("icerikler")} className="transition-colors hover:text-[#102e49]">Dokümanlar</button>
              <button onClick={() => goTo("icerikler")} className="transition-colors hover:text-[#102e49]">Haberler</button>
              <button onClick={() => goTo("soru-cevap")} className="transition-colors hover:text-[#102e49]">Soru-Cevap</button>
            </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button onClick={accountAction} variant="ghost" className="font-bold text-[#374151] hover:bg-[#f3f4f6]">{isAuthenticated ? "Panelim" : "Giriş yap"}</Button>
            <Button onClick={accountAction} className="h-11 rounded-full bg-[#5540e8] px-5 font-bold text-white shadow-[0_10px_20px_rgba(85,64,232,.18)] hover:bg-[#4632cf] active:scale-[.97]">
              {getHomePrimaryLabel(isAuthenticated)}<ArrowRight size={16} />
            </Button>
          </div>

          <button onClick={() => setMenuOpen(value => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#d8dcd6] bg-white md:hidden" aria-label="Menüyü aç">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        {menuOpen && <div className="border-t border-[#eef0f5] bg-white px-4 py-4 md:hidden"><div className="grid gap-1"><button onClick={() => goTo("icerikler")} className="rounded-xl px-4 py-3 text-left font-bold hover:bg-[#f4f2ff]">İçerikler</button><button onClick={() => goTo("yolculuk")} className="rounded-xl px-4 py-3 text-left font-bold hover:bg-white">Nasıl çalışır?</button><button onClick={() => goTo("sinavlar")} className="rounded-xl px-4 py-3 text-left font-bold hover:bg-white">Sınav hazırlığı</button><Button onClick={accountAction} className="mt-2 bg-[#5540e8]">{getHomeAccountLabel(isAuthenticated, loading)}</Button></div></div>}
      </header>

      <div className="border-b border-[#eef0f5] bg-[#fafaff] py-2 text-center text-xs font-medium text-[#4b5563]">Üst Reklam (Google AdSense / Firma Reklamı)</div>

      <main>
        <section className="relative h-[270px] overflow-hidden bg-[#2d55d9] text-white sm:h-[340px] lg:h-[410px]" aria-label="Öne çıkan içerikler">
          <div className="absolute inset-0 bg-gradient-to-r from-[#1f5fe8] via-[#3f35c4] to-[#6322a0]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(242,200,102,.22),transparent_28%),radial-gradient(circle_at_82%_80%,rgba(184,221,212,.2),transparent_30%)]" />
          <div className="container relative flex h-full items-center justify-center px-6 py-5 text-center">
            <div key={activeSlideIndex} className="max-w-3xl animate-in fade-in duration-500">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#f6d47f]">{currentSlide.eyebrow || "OkulBlog öne çıkanları"}</p>
              <h2 className="text-3xl font-black tracking-[-.055em] sm:text-4xl lg:text-5xl">{currentSlide.title}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#d5e0df] sm:text-base">{currentSlide.description || fallbackSlide.description}</p>
              <Button onClick={followSlideLink} className="mt-4 rounded-xl bg-[#ffd21a] px-7 font-black text-[#111827] shadow-[0_12px_30px_rgba(0,0,0,.18)] transition hover:-translate-y-0.5 hover:bg-[#ffe45b]">{currentSlide.buttonLabel || "İçerikleri keşfet"} <ArrowRight size={17} /></Button>
            </div>
          </div>
          <button type="button" onClick={() => setActiveSlideIndex(index => (index - 1 + Math.max(configuredSlides.length, 1)) % Math.max(configuredSlides.length, 1))} className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/35 focus:outline-none focus:ring-2 focus:ring-[#ffd21a]" aria-label="Önceki slayt"><ArrowRight className="rotate-180" size={20} /></button>
          <button type="button" onClick={() => setActiveSlideIndex(index => (index + 1) % Math.max(configuredSlides.length, 1))} className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/35 focus:outline-none focus:ring-2 focus:ring-[#f2c866]" aria-label="Sonraki slayt"><ArrowRight size={20} /></button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2" aria-label="Slayt seçimi">{(configuredSlides.length ? configuredSlides : [fallbackSlide]).map((slide, index) => <button type="button" key={"slider-dot-" + ("id" in slide ? slide.id : index)} onClick={() => setActiveSlideIndex(index)} className={`h-2.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[#f2c866] ${index === activeSlideIndex ? "w-8 bg-[#f2c866]" : "w-2.5 bg-white/45 hover:bg-white/80"}`} aria-label={`${index + 1}. slaytı göster`} />)}</div>
        </section>

        <section id="icerikler" className="bg-[#fafaff] py-16 sm:py-20"><div className="container"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#5540e8]">Dersleri keşfet</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-[#111827] sm:text-4xl">Dersler için kapsamlı içerikler seni bekliyor.</h2><p className="mt-3 text-sm text-[#6b7280]">Gerçek eğitim kategorilerinden seçerek test, doküman, video ve daha fazlasına ulaş.</p></div>{overview.isLoading ? <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[185px] animate-pulse rounded-[24px] bg-white" />)}</div> : overview.isError ? <div className="mx-auto mt-10 max-w-5xl rounded-2xl bg-white p-6 text-sm text-[#6b7280]">Dersler şu anda yüklenemiyor.</div> : <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">{subjectCards.map((category, index) => { const Icon = categoryIcon(category.name); const tones = ["from-[#2874ed] to-[#2364d7]", "from-[#a43ceb] to-[#7c2bd4]", "from-[#16b85b] to-[#0d9b49]", "from-[#ef3c3c] to-[#df2424]", "from-[#f1b900] to-[#d99400]", "from-[#df3a9b] to-[#c9217d]"]; const tone = tones[index % tones.length]; return <button key={category.id} onClick={() => { setSelectedCategoryId(category.id); window.setTimeout(() => goTo("kategori-sonuclar"), 0); }} className="group overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white text-left shadow-[0_8px_20px_rgba(31,41,55,.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(85,64,232,.14)]"><div className={"flex h-32 items-center justify-center bg-gradient-to-br " + tone + " text-white"}><Icon size={38} strokeWidth={1.7} /></div><div className="p-5"><h3 className="text-lg font-extrabold text-[#111827]">{category.name}</h3><p className="mt-1 text-sm text-[#6b7280]">{categoryLevelLabel(category.level)}</p></div></button>; })}</div>}</div></section>

        <section id="baslangic" className="relative overflow-hidden bg-gradient-to-br from-[#1f5fe8] via-[#3f35c4] to-[#6322a0] text-white">
          <div className="pointer-events-none absolute inset-0 opacity-[.08]" style={{ backgroundImage: "radial-gradient(#f6d881 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="pointer-events-none absolute -right-36 top-[-13rem] h-[36rem] w-[36rem] rounded-full border-[62px] border-[#e5ae55]/20" />
          <div className="container relative grid gap-4 py-5 sm:gap-6 sm:py-7 lg:min-h-[280px] lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:py-7">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3.5 py-2 text-[11px] font-bold tracking-[.12em] text-[#f6d47f] uppercase"><Sparkles size={14} /> {currentSlide.eyebrow || "Eğitim için düzenli bir alan"}</div>
              <h1 className="max-w-2xl text-[1.8rem] font-semibold leading-[.92] tracking-[-.073em] sm:text-5xl lg:text-[3.2rem]">{currentSlide.title}</h1>
              <p className="mt-2 max-w-lg text-xs leading-5 text-[#c4d1d3] sm:mt-3 sm:text-sm sm:leading-6">{currentSlide.description || fallbackSlide.description}</p>
              <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:gap-2.5">
                <Button onClick={followSlideLink} size="lg" className="h-13 rounded-full bg-[#f2c866] px-6 font-bold text-[#1b354c] hover:bg-[#f7d982]">{currentSlide.buttonLabel || "İçerikleri keşfet"} <ArrowDownRight size={18} /></Button>
                <Button onClick={() => goTo("yolculuk")} variant="outline" size="lg" className="h-13 rounded-full border-white/25 bg-white/[.03] px-6 font-bold text-white hover:bg-white/10 hover:text-white"><PlayCircle size={18} /> Nasıl çalışır?</Button>
              </div>
              {configuredSlides.length > 1 && <div className="mt-8 flex items-center gap-2" aria-label="Slider seçimi">{configuredSlides.map((slide, index) => <button key={slide.id} onClick={() => setActiveSlideIndex(index)} className={`h-2.5 rounded-full transition-all ${index === activeSlideIndex ? "w-8 bg-[#f2c866]" : "w-2.5 bg-white/35 hover:bg-white/60"}`} aria-label={`${index + 1}. slide: ${slide.title}`} />)}</div>}
              <div className="mt-3 hidden flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#b6c7c9] sm:flex"><span>• Kazanım odaklı</span><span>• Rol tabanlı</span><span>• Yapay zekâ destekli</span></div>
            </div>

            <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[360px] lg:absolute lg:right-5 lg:top-1/2 lg:w-[320px] lg:-translate-y-1/2">
              <div className="absolute -left-5 top-20 h-48 w-48 rounded-full bg-[#c9e4dc]/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[20px] border border-white/25 bg-white/95 p-2.5 text-[#15344e] shadow-[0_16px_40px_rgba(31,41,55,.24)] sm:rounded-[24px] sm:p-3.5">
                <div className="flex items-center justify-between border-b border-[#e1e2d9] pb-4"><div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#cce9df] text-[#176559]"><Search size={17} /></span><div><p className="text-sm font-bold">Öğrenme yolu</p><p className="text-[11px] text-[#75838a]">Adım adım keşfet</p></div></div><span className="rounded-full bg-[#f5e4b6] px-3 py-1 text-[10px] font-bold text-[#855f20]">AKILLI SEÇİM</span></div>
                <div className="mt-3 rounded-[20px] bg-[#172c74] p-4 text-white sm:mt-4 sm:rounded-[22px] sm:p-5"><p className="text-[10px] font-bold tracking-[.16em] text-[#a9c9c4] uppercase">Eğitim kategorisi</p><p className="mt-2 text-xl font-semibold tracking-[-.03em]">Türkçe · 1. Sınıf</p><div className="mt-5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[#e7eff0]"><span className="rounded-md bg-white/10 px-2 py-1">Ders</span><ChevronRight size={12} className="text-[#85aa9f]" /><span className="rounded-md bg-white/10 px-2 py-1">Ünite</span><ChevronRight size={12} className="text-[#85aa9f]" /><span className="rounded-md bg-[#e8b75e] px-2 py-1 text-[#19384f]">Kazanım</span></div></div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 sm:mt-3 sm:gap-2"><MiniTile icon={FileText} label="Doküman" tone="bg-[#e6f1ec] text-[#286b5e]" /><MiniTile icon={Target} label="Test" tone="bg-[#fbefd3] text-[#8f6621]" /><MiniTile icon={BrainCircuit} label="AI çalışma" tone="bg-[#ece8f7] text-[#604985]" /></div>
                <div className="mt-2 flex items-center justify-between rounded-2xl sm:mt-3 border border-[#e3e5dc] bg-white px-4 py-3"><div><p className="text-xs font-bold">Sıradaki çalışma</p><p className="mt-0.5 text-[11px] text-[#77858a]">Okuduğunu anlama</p></div><ArrowRight size={17} className="text-[#739b90]" /></div>
              </div>
              {(user?.role === "admin" || user?.role === "teacher") && <QuestionProductionDashboard compact className="mt-3 lg:absolute lg:top-16 lg:-left-3 lg:w-[230px] lg:scale-[.78] lg:origin-top-left lg:shadow-[0_16px_40px_rgba(0,0,0,.22)]" />}
              <div className="absolute -bottom-2 -right-2 rounded-xl bg-[#ffd21a] px-3 py-2 text-[#111827] shadow-xl sm:-right-5"><p className="text-[10px] font-bold tracking-[.12em] uppercase">Odak</p><p className="mt-1 text-sm font-bold">Bir hedef. Bir yol.</p></div>
            </div>
          </div>
        </section>

        <section aria-label="Platform istatistikleri" className="relative z-10 -mt-8 bg-transparent"><div className="container grid gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-[22px] bg-white px-5 py-5 text-center shadow-[0_14px_28px_rgba(31,41,55,.12)] ring-1 ring-[#eef0f5]"><strong className="block text-3xl font-black tracking-[-.04em] text-[#2864d8]">{overview.data?.content?.filter(item => item.contentType === "test").length ?? 0}</strong><span className="mt-1 block text-xs font-bold text-[#6b7280]">Aktif Test</span></div><div className="rounded-[22px] bg-white px-5 py-5 text-center shadow-[0_14px_28px_rgba(31,41,55,.12)] ring-1 ring-[#eef0f5]"><strong className="block text-3xl font-black tracking-[-.04em] text-[#5540e8]">{overview.data?.content?.filter(item => item.contentType === "document").length ?? 0}</strong><span className="mt-1 block text-xs font-bold text-[#6b7280]">Doküman</span></div><div className="rounded-[22px] bg-white px-5 py-5 text-center shadow-[0_14px_28px_rgba(31,41,55,.12)] ring-1 ring-[#eef0f5]"><strong className="block text-3xl font-black tracking-[-.04em] text-[#8b35d8]">{overview.data?.content?.filter(item => item.contentType === "video").length ?? 0}</strong><span className="mt-1 block text-xs font-bold text-[#6b7280]">Video Ders</span></div><div className="rounded-[22px] bg-white px-5 py-5 text-center shadow-[0_14px_28px_rgba(31,41,55,.12)] ring-1 ring-[#eef0f5]"><strong className="block text-3xl font-black tracking-[-.04em] text-[#d62676]">{overview.data?.educationCategories?.length ?? 0}</strong><span className="mt-1 block text-xs font-bold text-[#6b7280]">Eğitim Kategorisi</span></div></div></section>

        <section className="border-b border-[#eef0f5] bg-white"><div className="container grid gap-5 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center"><p className="text-sm font-bold text-[#24435b]">Nereden başlamak istersiniz?</p><div className="hidden h-px bg-[#d9ddd5] sm:block" /><div className="flex flex-wrap gap-2"><button onClick={() => goTo("icerikler")} className="rounded-full border border-[#d8dcd5] bg-white px-4 py-2 text-xs font-bold text-[#466170] transition hover:border-[#9abbb1] hover:text-[#155e55]">Okul dersleri</button><button onClick={() => goTo("sinavlar")} className="rounded-full border border-[#d8dcd5] bg-white px-4 py-2 text-xs font-bold text-[#466170] transition hover:border-[#9abbb1] hover:text-[#155e55]">Kurum sınavları</button></div></div></section>

        <section id="egitim-seviyeleri" className="bg-white py-16 sm:py-20"><div className="container"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#5540e8]">Kişisel başlangıç</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-[#111827] sm:text-4xl">Sınıfını seç, başarıya odaklan</h2><p className="mt-3 text-sm text-[#6b7280]">Sana en uygun içerikleri görmek için okuduğun sınıfı seçebilirsin.</p></div><div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-5">{["1. Sınıf","2. Sınıf","3. Sınıf","4. Sınıf","5. Sınıf","6. Sınıf","7. Sınıf","8. Sınıf","LGS"].map((grade, index) => <button key={grade} onClick={() => (isAuthenticated ? setLocation("/panel/kategoriler") : startLogin())} className={["group rounded-[22px] border border-[#e5e7eb] border-t-4", grade === "LGS" ? "border-t-[#7c3aed]" : "border-t-[#1687d9]", "bg-white p-5 text-center shadow-[0_8px_20px_rgba(31,41,55,.04)] transition duration-200 hover:-translate-y-1 hover:border-[#5540e8] hover:shadow-[0_16px_30px_rgba(85,64,232,.14)] focus:outline-none focus:ring-2 focus:ring-[#5540e8] focus:ring-offset-2"].join(" ")}><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#f0f5ff] text-xl font-medium text-[#111827]">{index + 1}</span><strong className="mt-5 block text-sm font-extrabold text-[#111827]">{grade}</strong><span className="mt-2 block text-[10px] font-bold uppercase tracking-[.12em] text-[#9ca3af]">İçerikleri gör</span></button>)}</div></div></section>

        <section id="populer-kategoriler" className="border-b border-[#e0e1d9] bg-[#f7f4ed] py-16 sm:py-20"><div className="container"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="editorial-kicker text-[#5c877e]">Hızlı başlangıç</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em] text-[#102e49] sm:text-4xl">Popüler eğitim kategorileri</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7d82]">Öğrenme yolunuza en sık kullanılan başlangıç noktalarından biriyle devam edin.</p></div><button onClick={() => goTo("icerikler")} className="inline-flex items-center gap-2 self-start text-sm font-bold text-[#356f68] transition hover:text-[#102e49] sm:self-auto">Tüm içerikleri gör <ArrowRight size={16} /></button></div>{overview.isLoading ? <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[132px] animate-pulse rounded-[22px] border border-[#e1e2da] bg-white/70" />)}</div> : overview.isError ? <div className="mt-8 rounded-[22px] border border-[#ead6c9] bg-[#fff8f1] p-6 text-sm text-[#8a5a43]">Kategoriler şu anda yüklenemiyor. Lütfen biraz sonra tekrar deneyin.</div> : educationCategories.length === 0 ? <div className="mt-8 rounded-[22px] border border-dashed border-[#c9d6cf] bg-white/60 p-7 text-sm text-[#6b7d82]">Henüz eğitim kategorisi eklenmedi. Admin panelinden İlkokul veya Ortaokul kategorisi oluşturarak bu alanı doldurabilirsiniz.</div> : displayedEducationCategories.length === 0 ? <div className="mt-8 rounded-[22px] border border-dashed border-[#c9d6cf] bg-white/60 p-7 text-sm text-[#6b7d82]">Admin henüz ana sayfa için popüler kategori seçmedi.</div> : <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{displayedEducationCategories.map((category) => <PopularCategory key={category.id} icon={categoryIcon(category.name)} label={category.name} detail={categoryLevelLabel(category.level)} tone={categoryTone(category.id)} ink={categoryInk(category.id)} active={selectedCategoryId === category.id} onClick={() => { setSelectedCategoryId(category.id); window.setTimeout(() => goTo("kategori-sonuclar"), 0); }} />)}</div>}</div></section>

        {selectedCategory && <section id="kategori-sonuclar" className="container pt-8 scroll-mt-24" aria-live="polite"><div className="rounded-[26px] border border-[#cfe0d9] bg-[#eef6f1] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#5c877e]">Seçili öğrenme yolu</p><h3 className="mt-1 text-xl font-bold tracking-[-.035em] text-[#17354d]">{selectedCategory.name}</h3></div><button onClick={() => setSelectedCategoryId(null)} className="self-start text-sm font-bold text-[#356f68] underline underline-offset-4">Temizle</button></div>{filteredContent.isLoading ? <div className="mt-5 h-20 animate-pulse rounded-2xl bg-white/70" /> : filteredContent.isError ? <p className="mt-5 rounded-2xl bg-[#fff8f1] p-4 text-sm text-[#8a5a43]">Bu kategoriye ait içerikler şu anda yüklenemiyor.</p> : filteredContent.data?.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{filteredContent.data.slice(0, 4).map(item => <button key={item.id} onClick={accountAction} className="group rounded-2xl border border-[#d8e6de] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(16,46,73,.06)]"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#e7f2ec] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#397267]">{contentTypeLabel(item.contentType)}</span><ArrowRight size={15} className="text-[#8aa99e] transition-transform group-hover:translate-x-1" /></div><p className="mt-3 font-bold text-[#17354d]">{item.title}</p>{item.summary && <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#71828a]">{item.summary}</p>}</button>)}</div> : <p className="mt-5 rounded-2xl border border-dashed border-[#c9d6cf] bg-white/60 p-4 text-sm text-[#6b7d82]">Bu kategoriye henüz içerik eklenmemiş. Admin veya Öğretmen panelinden bu kategoriye bağlı içerik oluşturabilirsiniz.</p>}</div></section>}



        <section id="duyurular" className="bg-white py-16 sm:py-20"><div className="container"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#5540e8]">Güncel duyurular</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-[#111827] sm:text-4xl">Eğitim dünyasından en son haberler.</h2><p className="mt-3 text-sm text-[#6b7280]">OkulBlog’daki güncel içerikleri ve önemli gelişmeleri takip edin.</p></div><button onClick={() => setLocation("/panel/haberler")} className="inline-flex items-center gap-2 self-start rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#5540e8] hover:text-[#5540e8]">Tüm haberleri gör <ArrowRight size={16} /></button></div>{newsItems.length ? <div className="mt-10 grid gap-5 md:grid-cols-3">{newsItems.map(item => <button key={item.id} onClick={() => setLocation("/panel/haberler")} className="group overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white text-left shadow-[0_8px_20px_rgba(31,41,55,.04)] transition hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(85,64,232,.12)]"><div className="h-36 bg-[#eef5ff]">{item.coverImageUrl ? <img src={item.coverImageUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-[#8bb7ed]"><Megaphone size={30} /></div>}</div><div className="p-5"><span className="rounded-md bg-[#f0f5ff] px-2 py-1 text-[10px] font-bold text-[#2864d8]">GÜNCEL</span><h3 className="mt-4 line-clamp-2 text-lg font-extrabold text-[#111827]">{item.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-5 text-[#6b7280]">{item.summary || "OkulBlog’dan güncel eğitim duyurusu."}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#2864d8]">Oku <ArrowRight size={14} /></span></div></button>)}</div> : <div className="mt-10 grid gap-5 md:grid-cols-3">{["Sınav ve başvuru duyuruları", "Yeni kaynaklar ve dokümanlar", "Güncel test ve ders içerikleri"].map(title => <div key={title} className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-[0_8px_20px_rgba(31,41,55,.04)]"><div className="grid h-36 place-items-center rounded-2xl bg-[#eef5ff] text-[#8bb7ed]"><Megaphone size={30} /></div><h3 className="mt-5 text-lg font-extrabold text-[#111827]">{title}</h3><p className="mt-2 text-sm text-[#6b7280]">Yakında yayınlanacak güncel içerikleri burada görebilirsiniz.</p></div>)}</div>}</div></section>

        <section id="sinavlar" className="border-y border-[#dae0d8] bg-[#dcece6]"><div className="container grid gap-10 py-20 sm:py-24 lg:grid-cols-[1fr_.94fr] lg:items-center"><div><p className="editorial-kicker text-[#4a786d]">Kurum kategorisi</p><h2 className="mt-4 max-w-xl text-4xl font-semibold leading-[.99] tracking-[-.055em] text-[#12364f] sm:text-5xl">Sınav hazırlığı, okul akışından bağımsız hareket eder.</h2><p className="mt-6 max-w-lg leading-7 text-[#4d6d70]">KPSS ve kamu kurumu sınavları için alt kategori yapısı, aktif/pasif yönetim ve ilgili içeriklerinizi ayrı bir alanda düzenleyin.</p><Button onClick={() => (isAuthenticated ? setLocation("/panel/kurum-kategorisi") : startLogin())} className="mt-8 rounded-full bg-[#12364f] px-6 font-bold text-white hover:bg-[#214c66]">Sınav alanına git <ArrowRight size={16} /></Button></div><div className="rounded-[28px] border border-white/80 bg-[#f7f5ed] p-6 shadow-[0_18px_35px_rgba(33,78,74,.1)] sm:p-8"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#153b58] text-[#f1c867]"><BookOpen size={21} /></span><span className="rounded-full bg-[#e2f0eb] px-3 py-1.5 text-[10px] font-bold text-[#2f6c5d]">BAĞIMSIZ YAPI</span></div><div className="mt-9 space-y-2">{["Kurum Kategorisi", "Alt Kategori", "İçerik ve Soru Havuzu"].map((item, index) => <div className="flex items-center gap-3" key={item}><span className="grid h-7 w-7 place-items-center rounded-full bg-[#dcece6] text-xs font-bold text-[#28685c]">{index + 1}</span><div className="flex flex-1 items-center justify-between rounded-xl border border-[#e2e4dd] bg-white px-4 py-3 text-sm font-bold text-[#29475b]"><span>{item}</span>{index < 2 && <ChevronRight size={15} className="text-[#82a69e]" />}</div></div>)}</div></div></div></section>

        <section id="yolculuk" className="container py-20 sm:py-28"><div className="rounded-[32px] bg-[#102e49] px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-14"><div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]"><div><p className="editorial-kicker text-[#a8cfc5]">Çalışma düzeni</p><h2 className="mt-4 text-4xl font-semibold leading-[.98] tracking-[-.055em] sm:text-5xl">Daha az karmaşa.<br /><span className="font-serif italic text-[#f2c866]">Daha çok odak.</span></h2><p className="mt-6 max-w-sm leading-7 text-[#c0d0d3]">OkulBlog, içerik üretiminden çalışmaya kadar her adımı izlenebilir bir eğitim yoluna bağlar.</p></div><div className="grid gap-3">{steps.map(([number, title, text]) => <div key={number} className="grid grid-cols-[42px_1fr_auto] gap-3 rounded-2xl border border-white/10 bg-white/[.055] p-5 sm:grid-cols-[55px_1fr_auto] sm:items-center"><span className="font-serif text-2xl italic text-[#f2c866]">{number}</span><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-[#b9c9cc]">{text}</p></div><ArrowRight size={17} className="text-[#83ada5]" /></div>)}</div></div></div></section>
        <section id="soru-cevap" className="border-t border-[#dfe4dc] bg-[#f7f8f2]"><div className="container grid gap-5 py-16 lg:grid-cols-[1.15fr_.85fr] lg:items-center"><div><p className="editorial-kicker text-[#5c877e]">Topluluk alanı</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.055em] text-[#102e49]">Takıldığın yerde birlikte düşünelim.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-[#71838b]">Sorularını ve kaynak görsellerini paylaş; yalnızca üyeler soru ve cevap yazabilir. Gönderiler Admin onayından sonra yayınlanır.</p><Button onClick={() => setLocation("/soru-cevap")} className="mt-6 rounded-full bg-[#18344f]">Soru-Cevap alanına git <ArrowRight size={16} /></Button><p className="mt-3 text-xs text-[#8a999b]">{qaPreview.data?.questions.length ?? 0} yayınlanmış soru</p></div><div className="rounded-[26px] border border-[#e1e5dc] bg-white p-6 shadow-[0_14px_30px_rgba(61,77,91,.06)]"><div className="flex items-center justify-between"><div><p className="text-xs font-bold tracking-[.16em] text-[#7b928f] uppercase">Bize ulaşın</p><h3 className="mt-2 text-2xl font-bold text-[#29465a]">OkulBlog ekibi burada.</h3></div><MessageCircle size={25} className="text-[#47736a]" /></div>{siteContact.data?.contact_enabled === "false" ? <p className="mt-4 text-sm text-[#71838b]">İletişim alanı şu anda kapalı.</p> : <><p className="mt-4 text-sm leading-6 text-[#71838b]">{siteContact.data?.contact_description || "Öneri, iş birliği ve destek talepleriniz için bize ulaşın."}</p><div className="mt-5 space-y-2 text-sm text-[#365368]">{siteContact.data?.contact_email && <p><strong>E-posta:</strong> {siteContact.data.contact_email}</p>}{siteContact.data?.contact_phone && <p><strong>Telefon:</strong> {siteContact.data.contact_phone}</p>}{siteContact.data?.contact_address && <p><strong>Adres:</strong> {siteContact.data.contact_address}</p>}</div></>}</div></div></section>
      </main>

      <footer className="bg-[#111827] text-white"><div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4"><div><div className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#5540e8] text-white"><GraduationCap size={18} /></span> okul<span className="text-[#ffd21a]">blog</span></div><p className="mt-4 max-w-xs text-sm leading-6 text-[#9ca3af]">Öğrencilerin sınav yolculuğunda güvenilir içerik ve düzenli öğrenme alanı.</p></div><div><h3 className="font-bold">Keşfet</h3><div className="mt-4 grid gap-3 text-sm text-[#9ca3af]"><button onClick={() => goTo("icerikler")} className="text-left transition hover:text-white">Tüm dersler</button><button onClick={() => goTo("egitim-seviyeleri")} className="text-left transition hover:text-white">Sınıf seçimi</button><button onClick={() => goTo("sinavlar")} className="text-left transition hover:text-white">Sınav alanı</button></div></div><div><h3 className="font-bold">Destek</h3><div className="mt-4 grid gap-3 text-sm text-[#9ca3af]"><button onClick={() => goTo("soru-cevap")} className="text-left transition hover:text-white">Soru-Cevap</button><button onClick={() => setLocation("/soru-cevap")} className="text-left transition hover:text-white">İletişim</button><button onClick={openPanel} className="text-left transition hover:text-white">Yönetim Paneli</button></div></div><div><h3 className="font-bold">Bülten</h3><p className="mt-4 text-sm text-[#9ca3af]">Yeni içeriklerden haberdar ol.</p><div className="mt-3 flex"><input aria-label="E-posta" placeholder="E-posta" className="min-w-0 flex-1 rounded-l-xl border-0 bg-[#1f2937] px-3 py-2 text-sm text-white outline-none placeholder:text-[#6b7280] focus:ring-2 focus:ring-[#5540e8]" /><button aria-label="Bültene katıl" className="rounded-r-xl bg-[#5540e8] px-4 text-white transition hover:bg-[#4632cf]"><ArrowRight size={16} /></button></div></div></div><div className="container border-t border-white/10 py-5 text-center text-xs text-[#6b7280]">© {new Date().getFullYear()} OkulBlog. Tüm hakları saklıdır.</div></footer>
      </div>
    </>
  );
}

function contentTypeLabel(type: string) {
  const labels: Record<string, string> = { test: "Test", document: "Doküman", simulation: "Simülasyon", video: "Video", game: "Oyun", news: "Haber" };
  return labels[type] ?? "İçerik";
}

function categoryIcon(name: string) {
  const normalized = name.toLocaleLowerCase("tr-TR");
  if (normalized.includes("matematik")) return Target;
  if (normalized.includes("türkçe") || normalized.includes("edebiyat")) return BookOpen;
  if (normalized.includes("fen") || normalized.includes("bilim")) return Layers3;
  if (normalized.includes("sınıf") || normalized.includes("ilkokul") || normalized.includes("ortaokul")) return GraduationCap;
  return BrainCircuit;
}

function categoryLevelLabel(level: string) {
  const labels: Record<string, string> = { "ana-grup": "Eğitim ana grubu", "school-level": "Okul seviyesi", class: "Sınıf ve ders akışı", subject: "Ders kaynakları", unit: "Ünite çalışmaları", outcome: "Kazanım odaklı çalışma" };
  return labels[level] ?? "Eğitim içerikleri";
}

function categoryTone(id: number) {
  return ["bg-[#e5f1eb]", "bg-[#e9e4f3]", "bg-[#fbefd3]", "bg-[#f4ddd8]", "bg-[#dce9f4]", "bg-[#e7e4d2]"][id % 6];
}

function categoryInk(id: number) {
  return ["text-[#2b7062]", "text-[#625087]", "text-[#90661e]", "text-[#8a4d42]", "text-[#2b5c82]", "text-[#6b6b37]"][id % 6];
}

function LevelCard({ eyebrow, title, description, tone, slice, grades, tags, onClick }: { eyebrow: string; title: string; description: string; tone: "peach" | "lavender" | "sky"; slice: "left" | "center" | "right"; grades: string[]; tags: string[]; onClick: () => void }) {
  const tones = { peach: "border-[#eadfcf] bg-[#fffaf0]", lavender: "border-[#e1dcf0] bg-[#faf8ff]", sky: "border-[#d9e7ef] bg-[#f4fbff]" };
  const pills = { peach: "bg-[#fff0cf] text-[#9b661d]", lavender: "bg-[#eee7ff] text-[#7056a0]", sky: "bg-[#e1f1fb] text-[#2e759b]" };
  return <section className={`overflow-hidden rounded-[28px] border p-5 shadow-[0_14px_32px_rgba(61,77,91,.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(61,77,91,.11)] ${tones[tone]}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold tracking-[.17em] text-[#77858d]">{eyebrow}</p><h3 className="mt-2 text-[25px] font-extrabold leading-[.98] tracking-[-.055em] text-[#142e49]">{title}</h3></div><ObjectSlice slice={slice} /></div><p className="mt-4 min-h-10 text-xs leading-5 text-[#71818a]">{description}</p><div className="mt-5 grid grid-cols-2 gap-2">{grades.map((grade, index) => <button key={grade} onClick={onClick} className="group flex items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-3 py-3 text-left shadow-[0_4px_12px_rgba(73,88,95,.04)] transition hover:bg-white"><span className={`grid h-8 w-8 place-items-center rounded-xl text-sm font-extrabold ${pills[tone]}`}>{index + 1}</span><span className="min-w-0 flex-1 truncate text-xs font-bold text-[#29445a]">{grade}</span><ArrowRight size={13} className="text-[#9caeb2] transition-transform group-hover:translate-x-0.5" /></button>)}</div><div className="mt-4 flex flex-wrap gap-2">{tags.map(tag => <button key={tag} onClick={onClick} className="rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-[10px] font-bold text-[#5c737c] transition hover:bg-white">{tag}</button>)}</div></section>;
}
function ObjectSlice({ slice }: { slice: "left" | "center" | "right" }) {
  const positions = { left: "left-0", center: "left-[-100%]", right: "left-[-200%]" };
  return <span className="relative block h-[70px] w-[92px] shrink-0 overflow-hidden rounded-2xl"><img src="/manus-storage/okulblog-education-levels_5de893cf.png" alt="" className={`absolute top-0 h-full w-[300%] max-w-none object-cover ${positions[slice]}`} /></span>;
}
function QuickStat({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return <div className="flex items-center gap-3 bg-white px-4 py-4 sm:px-5"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#f5f1e7] text-base">{icon}</span><span><strong className="block text-sm font-extrabold text-[#29445a]">{title}</strong><small className="mt-0.5 block text-[10px] text-[#7b8a8d]">{detail}</small></span></div>;
}
function PopularCategory({ icon: Icon, label, detail, tone, ink, active, onClick }: { icon: typeof FileText; label: string; detail: string; tone: string; ink: string; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`group flex min-h-[132px] items-center gap-4 rounded-[22px] border p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(16,46,73,.07)] ${active ? "border-[#6c9e93] bg-white shadow-[0_10px_24px_rgba(16,46,73,.06)]" : "border-[#e1e2da] bg-[#fbfaf6] hover:border-[#b6c9c0]"}`}><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone} ${ink}`}><Icon size={21} /></span><span className="min-w-0 flex-1"><span className="block text-lg font-bold tracking-[-.035em] text-[#17354d]">{label}</span><span className="mt-1 block text-sm leading-5 text-[#74848a]">{detail}</span></span><ArrowRight size={17} className="shrink-0 text-[#a3afb0] transition-transform group-hover:translate-x-1 group-hover:text-[#356f68]" /></button>;
}

function MiniTile({ icon: Icon, label, tone }: { icon: typeof FileText; label: string; tone: string }) {
  return <div className={`rounded-2xl p-3 ${tone}`}><Icon size={16} /><p className="mt-5 text-[11px] font-bold">{label}</p></div>;
}
