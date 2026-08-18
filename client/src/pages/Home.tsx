import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { QuestionProductionDashboard } from "@/components/QuestionProductionDashboard";
import { trpc } from "@/lib/trpc";
import { getHomeLoaderDelay } from "@/lib/homeLoading";
import { getHomeAccountLabel, getHomePrimaryLabel } from "@shared/homeNavigation";
import { categoryIdsForSelection, classGroupForName } from "./ContentHub";
import {
  ArrowDownRight,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  FileText,
  Gamepad2,
  GraduationCap,
  Layers3,
  Menu,
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
  { name: "Testler", value: "test", detail: "Ölçme ve değerlendirme", path: "/icerik/test", icon: Target, accent: "bg-[#e7b354]", ink: "text-[#7b4d0e]" },
  { name: "Dokümanlar", value: "document", detail: "Düzenli kaynak arşivi", path: "/icerik/document", icon: FileText, accent: "bg-[#b8ddd4]", ink: "text-[#155d55]" },
  { name: "Simülasyonlar", value: "simulation", detail: "Görerek ve deneyerek öğren", path: "/icerik/simulation", icon: Layers3, accent: "bg-[#d8c8e8]", ink: "text-[#60447a]" },
  { name: "Videolar", value: "video", detail: "Odaklı anlatımlar", path: "/icerik/video", icon: Video, accent: "bg-[#f3c7bd]", ink: "text-[#873d31]" },
  { name: "Oyunlar", value: "game", detail: "Aktif tekrar deneyimi", path: "/icerik/game", icon: Gamepad2, accent: "bg-[#bcd5ee]", ink: "text-[#24567b]" },
  { name: "Haberler", value: "news", detail: "Eğitimden seçili gündem", path: "/icerik/news", icon: BookOpen, accent: "bg-[#d6dfad]", ink: "text-[#536a1d]" },
];

const faqItems = [
  { question: "Üyelik zorunlu mu?", answer: "İçerikleri keşfetmek için üyelik zorunlu değildir. Soru-Cevap alanına yazmak ve kişisel ilerlemenizi takip etmek için üye olabilirsiniz." },
  { question: "Ders içeriklerini nasıl bulabilirim?", answer: "Dersleri Keşfet kartından bir eğitim kategorisi seçin; ardından Testler, Dokümanlar, Videolar ve diğer içerik türleri arasından filtre uygulayın." },
  { question: "Öğretmenler içerik ekleyebilir mi?", answer: "Yetkisi açılmış öğretmen ve moderatörler, Admin tarafından belirlenen modüller üzerinden içerik ve soru üretebilir." },
  { question: "Bir sorun veya öneriyi nereye iletebilirim?", answer: "Bu sayfadaki iletişim formunu kullanabilir veya Soru-Cevap alanında toplulukla paylaşabilirsiniz." },
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
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedContentType, setSelectedContentType] = useState("all");
  const [faqQuery, setFaqQuery] = useState("");
  const [loaderStartedAt] = useState(() => Date.now());
  const [showLoader, setShowLoader] = useState(true);
  const [location, setLocation] = useLocation();
  const homeSlides = trpc.platform.homeSlides.useQuery();
  const overview = trpc.platform.overview.useQuery();
  const popularEducationCategories = trpc.platform.popularEducationCategories.useQuery();
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
  const visibleCategoryContent = selectedContentType === "all" ? filteredContent.data : filteredContent.data?.filter(item => item.contentType === selectedContentType);
  const configuredSlides = homeSlides.data ?? [];
  const pageReady = !loading && !homeSlides.isLoading && !overview.isLoading && !popularEducationCategories.isLoading;

  const updateFilterUrl = (categoryId: number | null, contentType: string) => {
    const params = new URLSearchParams();
    if (categoryId !== null) params.set("categoryId", String(categoryId));
    if (contentType !== "all") params.set("contentType", contentType);
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryId = Number(params.get("categoryId"));
    const contentType = params.get("contentType");
    if (Number.isInteger(categoryId) && categoryId > 0 && educationCategories.some(category => category.id === categoryId)) setSelectedCategoryId(categoryId);
    if (contentType && contentAreas.some(area => area.value === contentType)) setSelectedContentType(contentType);
  }, [location, educationCategories]);

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
    const timer = window.setInterval(() => setActiveSlideIndex(index => (index + 1) % configuredSlides.length), 5000);
    return () => window.clearInterval(timer);
  }, [configuredSlides.length]);

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

            <nav className="hidden items-center gap-3 text-[11px] font-bold text-[#374151] xl:flex">
              <button onClick={() => goTo("icerikler")} className="relative rounded-full px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0edff] hover:text-[#5540e8] hover:shadow-[0_6px_14px_rgba(85,64,232,.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8]/40 active:scale-95">Ana Sayfa</button>
              <button onClick={() => setLocation("/icerik/test")} className="relative rounded-full px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0edff] hover:text-[#5540e8] hover:shadow-[0_6px_14px_rgba(85,64,232,.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8]/40 active:scale-95">Testler</button>
              <button onClick={() => setLocation("/icerik/document")} className="relative rounded-full px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0edff] hover:text-[#5540e8] hover:shadow-[0_6px_14px_rgba(85,64,232,.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8]/40 active:scale-95">Dokümanlar</button>
              <button onClick={() => setLocation("/icerik/video")} className="relative rounded-full px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0edff] hover:text-[#5540e8] hover:shadow-[0_6px_14px_rgba(85,64,232,.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8]/40 active:scale-95">Videolar</button>
              <button onClick={() => setLocation("/icerik/game")} className="relative rounded-full px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0edff] hover:text-[#5540e8] hover:shadow-[0_6px_14px_rgba(85,64,232,.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8]/40 active:scale-95">Oyunlar</button>
              <button onClick={() => setLocation("/icerik/simulation")} className="relative rounded-full px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0edff] hover:text-[#5540e8] hover:shadow-[0_6px_14px_rgba(85,64,232,.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8]/40 active:scale-95">Simülasyonlar</button>
              <button onClick={() => setLocation("/icerik/news")} className="relative rounded-full px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0edff] hover:text-[#5540e8] hover:shadow-[0_6px_14px_rgba(85,64,232,.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8]/40 active:scale-95">Haberler</button>
              <button onClick={() => setLocation("/soru-cevap")} className="relative rounded-full px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0edff] hover:text-[#5540e8] hover:shadow-[0_6px_14px_rgba(85,64,232,.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8]/40 active:scale-95">Soru-Cevap</button>
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
        {menuOpen && <div className="border-t border-[#eef0f5] bg-white px-4 py-4 md:hidden"><div className="grid gap-1"><button onClick={() => goTo("icerikler")} className="rounded-xl px-4 py-3 text-left font-bold transition-all duration-200 hover:translate-x-1 hover:bg-[#f4f2ff] hover:text-[#5540e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8]/40 active:scale-[.98]">Ana Sayfa</button>{[["Testler", "/icerik/test"], ["Dokümanlar", "/icerik/document"], ["Videolar", "/icerik/video"], ["Oyunlar", "/icerik/game"], ["Simülasyonlar", "/icerik/simulation"], ["Haberler", "/icerik/news"], ["Soru-Cevap", "/soru-cevap"]].map(([label, path]) => <button key={path} onClick={() => setLocation(path)} className="rounded-xl px-4 py-3 text-left font-bold transition-all duration-200 hover:translate-x-1 hover:bg-[#f4f2ff] hover:text-[#5540e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8]/40 active:scale-[.98]">{label}</button>)}<Button onClick={accountAction} className="mt-2 bg-[#5540e8]">{getHomeAccountLabel(isAuthenticated, loading)}</Button></div></div>}
      </header>

      <div className="border-b border-[#eef0f5] bg-[#fafaff] py-2 text-center text-xs font-medium text-[#4b5563]">Üst Reklam (Google AdSense / Firma Reklamı)</div>

      <main>
        <section className="relative h-[270px] overflow-hidden bg-[#2d55d9] text-white sm:h-[340px] lg:h-[410px]" aria-label="Öne çıkan içerikler">
          <div className="absolute inset-0 bg-gradient-to-r from-[#1f5fe8] via-[#3f35c4] to-[#6322a0]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(242,200,102,.22),transparent_28%),radial-gradient(circle_at_82%_80%,rgba(184,221,212,.2),transparent_30%)]" />
          <div className="container relative flex h-full items-center justify-center px-6 py-5 text-center">
            <div key={activeSlideIndex} className="hero-slide-content max-w-3xl">
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

        <section id="icerikler" className="bg-[#fafaff] py-16 sm:py-20"><div className="container"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#5540e8]">Dersleri keşfet</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-[#111827] sm:text-4xl">Dersler için kapsamlı içerikler seni bekliyor.</h2><p className="mt-3 text-sm text-[#6b7280]">Gerçek eğitim kategorilerinden seçerek test, doküman, video ve daha fazlasına ulaş.</p></div>{overview.isLoading ? <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[185px] animate-pulse rounded-[24px] bg-white" />)}</div> : overview.isError ? <div className="mx-auto mt-10 max-w-5xl rounded-2xl bg-white p-6 text-sm text-[#6b7280]">Dersler şu anda yüklenemiyor.</div> : <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">{subjectCards.map((category, index) => { const Icon = categoryIcon(category.name); const group = category.level === "class" ? classGroupForName(category.name) : null; const GroupIcon = group?.icon === "book" ? BookOpen : group?.icon === "layers" ? Layers3 : group?.icon === "graduation" ? GraduationCap : group?.icon === "target" ? Target : null; const tones = ["from-[#2874ed] to-[#2364d7]", "from-[#a43ceb] to-[#7c2bd4]", "from-[#16b85b] to-[#0d9b49]", "from-[#ef3c3c] to-[#df2424]", "from-[#f1b900] to-[#d99400]", "from-[#df3a9b] to-[#c9217d]"]; const tone = group?.key === "elementary" ? "from-[#38a98d] to-[#20816f]" : group?.key === "middle" ? "from-[#3d88d8] to-[#24567b]" : group?.key === "high" ? "from-[#8e5bc7] to-[#60447a]" : tones[index % tones.length]; return <button key={category.id} onClick={() => { setSelectedCategoryId(category.id); setSelectedContentType("all"); updateFilterUrl(category.id, "all"); window.setTimeout(() => goTo("kategori-sonuclar"), 0); }} className="group overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white text-left shadow-[0_8px_20px_rgba(31,41,55,.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(85,64,232,.14)]"><div className={"relative flex h-32 items-center justify-center bg-gradient-to-br " + tone + " text-white"}>{GroupIcon ? <GroupIcon size={42} strokeWidth={1.7} aria-hidden="true" /> : <Icon size={38} strokeWidth={1.7} />}{group && <span className="absolute bottom-3 left-3 rounded-full bg-white/18 px-2.5 py-1 text-[10px] font-extrabold tracking-[.08em] text-white">{group.key === "elementary" ? "İLKOKUL 1–4" : group.key === "middle" ? "ORTAOKUL 5–8" : "LİSE 9–12"}</span>}</div><div className="p-5"><h3 className="text-lg font-extrabold text-[#111827]">{category.name}</h3><p className="mt-1 text-sm text-[#6b7280]">{categoryLevelLabel(category.level)}</p></div></button>; })}</div>}</div></section>

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

            <div className="relative mx-auto w-full max-w-[270px] sm:max-w-[330px] lg:absolute lg:right-5 lg:top-1/2 lg:w-[300px] lg:-translate-y-1/2">
              <div className="absolute -left-5 top-20 h-48 w-48 rounded-full bg-[#c9e4dc]/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[20px] border border-white/25 bg-white/95 p-2.5 text-[#15344e] shadow-[0_16px_40px_rgba(31,41,55,.24)] sm:rounded-[24px] sm:p-3.5">
                <div className="flex items-center justify-between border-b border-[#e1e2d9] pb-4"><div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#cce9df] text-[#176559]"><Search size={17} /></span><div><p className="text-sm font-bold">Öğrenme yolu</p><p className="text-[11px] text-[#75838a]">Adım adım keşfet</p></div></div><span className="rounded-full bg-[#f5e4b6] px-3 py-1 text-[10px] font-bold text-[#855f20]">AKILLI SEÇİM</span></div>
                <div className="mt-3 rounded-[20px] bg-[#172c74] p-4 text-white sm:mt-4 sm:rounded-[22px] sm:p-5"><p className="text-[10px] font-bold tracking-[.16em] text-[#a9c9c4] uppercase">Eğitim kategorisi</p><p className="mt-2 text-xl font-semibold tracking-[-.03em]">Türkçe · 1. Sınıf</p><div className="mt-5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[#e7eff0]"><span className="rounded-md bg-white/10 px-2 py-1">Ders</span><ChevronRight size={12} className="text-[#85aa9f]" /><span className="rounded-md bg-white/10 px-2 py-1">Ünite</span><ChevronRight size={12} className="text-[#85aa9f]" /><span className="rounded-md bg-[#e8b75e] px-2 py-1 text-[#19384f]">Kazanım</span></div></div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 sm:mt-3 sm:gap-2"><MiniTile icon={FileText} label="Doküman" tone="bg-[#e6f1ec] text-[#286b5e]" /><MiniTile icon={Target} label="Test" tone="bg-[#fbefd3] text-[#8f6621]" /><MiniTile icon={BrainCircuit} label="AI çalışma" tone="bg-[#ece8f7] text-[#604985]" /></div>
                <div className="mt-2 flex items-center justify-between rounded-2xl sm:mt-3 border border-[#e3e5dc] bg-white px-4 py-3"><div><p className="text-xs font-bold">Sıradaki çalışma</p><p className="mt-0.5 text-[11px] text-[#77858a]">Okuduğunu anlama</p></div><ArrowRight size={17} className="text-[#739b90]" /></div>
              </div>
              {(user?.role === "admin" || user?.role === "teacher") && <QuestionProductionDashboard compact className="mt-2 w-[190px] max-w-[72%] scale-[.82] origin-top-left sm:w-[205px] lg:absolute lg:top-14 lg:-left-2 lg:w-[200px] lg:scale-[.7] lg:shadow-[0_12px_30px_rgba(0,0,0,.2)]" />}
              <div className="absolute -bottom-2 -right-2 rounded-xl bg-[#ffd21a] px-3 py-2 text-[#111827] shadow-xl sm:-right-5"><p className="text-[10px] font-bold tracking-[.12em] uppercase">Odak</p><p className="mt-1 text-sm font-bold">Bir hedef. Bir yol.</p></div>
            </div>
          </div>
        </section>

        <section aria-label="Platform istatistikleri" className="relative z-10 -mt-8 bg-transparent"><div className="container grid gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-[22px] bg-white px-5 py-5 text-center shadow-[0_14px_28px_rgba(31,41,55,.12)] ring-1 ring-[#eef0f5]"><strong className="block text-3xl font-black tracking-[-.04em] text-[#2864d8]">{overview.data?.content?.filter(item => item.contentType === "test").length ?? 0}</strong><span className="mt-1 block text-xs font-bold text-[#6b7280]">Aktif Test</span></div><div className="rounded-[22px] bg-white px-5 py-5 text-center shadow-[0_14px_28px_rgba(31,41,55,.12)] ring-1 ring-[#eef0f5]"><strong className="block text-3xl font-black tracking-[-.04em] text-[#5540e8]">{overview.data?.content?.filter(item => item.contentType === "document").length ?? 0}</strong><span className="mt-1 block text-xs font-bold text-[#6b7280]">Doküman</span></div><div className="rounded-[22px] bg-white px-5 py-5 text-center shadow-[0_14px_28px_rgba(31,41,55,.12)] ring-1 ring-[#eef0f5]"><strong className="block text-3xl font-black tracking-[-.04em] text-[#8b35d8]">{overview.data?.content?.filter(item => item.contentType === "video").length ?? 0}</strong><span className="mt-1 block text-xs font-bold text-[#6b7280]">Video Ders</span></div><div className="rounded-[22px] bg-white px-5 py-5 text-center shadow-[0_14px_28px_rgba(31,41,55,.12)] ring-1 ring-[#eef0f5]"><strong className="block text-3xl font-black tracking-[-.04em] text-[#d62676]">{overview.data?.educationCategories?.length ?? 0}</strong><span className="mt-1 block text-xs font-bold text-[#6b7280]">Eğitim Kategorisi</span></div></div></section>

        <section className="border-b border-[#eef0f5] bg-white"><div className="container grid gap-5 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center"><p className="text-sm font-bold text-[#24435b]">Nereden başlamak istersiniz?</p><div className="hidden h-px bg-[#d9ddd5] sm:block" /><div className="flex flex-wrap gap-2"><button onClick={() => goTo("icerikler")} className="rounded-full border border-[#d8dcd5] bg-white px-4 py-2 text-xs font-bold text-[#466170] transition hover:border-[#9abbb1] hover:text-[#155e55]">Okul dersleri</button><button onClick={() => goTo("sinavlar")} className="rounded-full border border-[#d8dcd5] bg-white px-4 py-2 text-xs font-bold text-[#466170] transition hover:border-[#9abbb1] hover:text-[#155e55]">Kurum sınavları</button></div></div></section>

        <section id="egitim-seviyeleri" className="bg-white py-16 sm:py-20"><div className="container"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#5540e8]">Kişisel başlangıç</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-[#111827] sm:text-4xl">Sınıfını seç, başarıya odaklan</h2><p className="mt-3 text-sm text-[#6b7280]">Sana en uygun içerikleri görmek için okuduğun sınıfı seçebilirsin.</p></div><div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">{["1. Sınıf","2. Sınıf","3. Sınıf","4. Sınıf","5. Sınıf","6. Sınıf","7. Sınıf","8. Sınıf","9. Sınıf","10. Sınıf","11. Sınıf","12. Sınıf"].map((grade, index) => { const group = classGroupForName(grade); const summary = classSummary(grade, educationCategories as HomeCategoryNode[], (overview.data?.content ?? []) as HomeContentItem[]); const preview = summary.previews.length ? summary.previews : [{ id: -1, title: "Yeni içerikler burada görünecek", contentType: "test", status: "published" }]; const counts = Object.entries(summary.counts).filter(([, count]) => count > 0).slice(0, 3); return <div key={grade} className="group relative"><button type="button" onClick={() => setLocation(`/icerik/test?class=${encodeURIComponent(grade)}`)} aria-label={`${grade} içeriklerini gör`} className={`w-full rounded-[22px] border p-3 text-left shadow-[0_8px_20px_rgba(31,41,55,.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(85,64,232,.14)] focus:outline-none focus:ring-2 focus:ring-[#5540e8] focus:ring-offset-2 ${group.classes}`}><ClassCoverIllustration group={group} /><div className="px-2 pb-1 pt-3"><strong className="block text-sm font-extrabold text-[#17354d]">{grade}</strong><span className="mt-1 block text-[10px] font-bold uppercase tracking-[.1em] opacity-70">{summary.total} toplam içerik</span><div className="mt-3 flex flex-wrap gap-1.5">{counts.length ? counts.map(([type, count]) => <span key={type} className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold">{contentTypeLabel(type)} {count}</span>) : <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold">İçerik keşfet</span>}</div></div></button><div className="pointer-events-none absolute left-2 right-2 top-full z-20 mt-2 translate-y-1 rounded-2xl border border-[#e4e8e3] bg-white p-3 opacity-0 shadow-[0_16px_32px_rgba(31,41,55,.14)] transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100"><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7b8a8d]">Yeni içerikler</p>{preview.map(item => <p key={item.id} className="mt-2 truncate text-xs font-bold text-[#29445a]">{item.title}</p>)}</div></div>; })}</div></div></section>



        {selectedCategory && <section id="kategori-sonuclar" className="container scroll-mt-24 pt-8" aria-live="polite"><div className="rounded-[26px] border border-[#cfe0d9] bg-[#eef6f1] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#5c877e]">Seçili öğrenme yolu</p><h3 className="mt-1 text-xl font-bold tracking-[-.035em] text-[#17354d]">{selectedCategory.name}</h3></div><button onClick={() => { setSelectedCategoryId(null); setSelectedContentType("all"); updateFilterUrl(null, "all"); }} className="self-start text-sm font-bold text-[#356f68] underline underline-offset-4">Temizle</button></div><div className="mt-5 flex flex-wrap gap-2" aria-label="İçerik türü filtresi">{[{ value: "all", label: "Tümü" }, ...contentAreas.map(area => ({ value: area.value, label: area.name }))].map(filter => <button key={filter.value} type="button" onClick={() => { setSelectedContentType(filter.value); updateFilterUrl(selectedCategoryId, filter.value); }} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${selectedContentType === filter.value ? "border-[#5540e8] bg-[#5540e8] text-white" : "border-[#d8e6de] bg-white text-[#527068] hover:border-[#9abbb1]"}`}>{filter.label}</button>)}</div>{filteredContent.isLoading ? <div className="mt-5 h-20 animate-pulse rounded-2xl bg-white/70" /> : filteredContent.isError ? <p className="mt-5 rounded-2xl bg-[#fff8f1] p-4 text-sm text-[#8a5a43]">Bu kategoriye ait içerikler şu anda yüklenemiyor.</p> : visibleCategoryContent?.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{visibleCategoryContent.slice(0, 4).map(item => <button key={item.id} onClick={accountAction} className="group rounded-2xl border border-[#d8e6de] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(16,46,73,.06)]"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#e7f2ec] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#397267]">{contentTypeLabel(item.contentType)}</span><ArrowRight size={15} className="text-[#8aa99e] transition-transform group-hover:translate-x-1" /></div><p className="mt-3 font-bold text-[#17354d]">{item.title}</p>{item.summary && <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#71828a]">{item.summary}</p>}</button>)}</div> : <p className="mt-5 rounded-2xl border border-dashed border-[#c9d6cf] bg-white/60 p-4 text-sm text-[#6b7d82]">Bu filtrede henüz içerik bulunmuyor.</p>}</div></section>}


        <section id="duyurular" className="bg-white py-16 sm:py-20"><div className="container"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#5540e8]">Güncel duyurular</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-[#111827] sm:text-4xl">Eğitim dünyasından en son haberler.</h2><p className="mt-3 text-sm text-[#6b7280]">OkulBlog’daki güncel içerikleri ve önemli gelişmeleri takip edin.</p></div><button onClick={() => setLocation("/icerik/news")} className="inline-flex items-center gap-2 self-start rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#5540e8] hover:text-[#5540e8]">Tüm haberleri gör <ArrowRight size={16} /></button></div>{newsItems.length ? <div className="mt-10 grid gap-5 md:grid-cols-3">{newsItems.map(item => <button key={item.id} onClick={() => setLocation("/icerik/news")} className="group overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white text-left shadow-[0_8px_20px_rgba(31,41,55,.04)] transition hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(85,64,232,.12)]"><div className="h-36 bg-[#eef5ff]">{item.coverImageUrl ? <img src={item.coverImageUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-[#8bb7ed]"><Megaphone size={30} /></div>}</div><div className="p-5"><span className="rounded-md bg-[#f0f5ff] px-2 py-1 text-[10px] font-bold text-[#2864d8]">GÜNCEL</span><h3 className="mt-4 line-clamp-2 text-lg font-extrabold text-[#111827]">{item.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-5 text-[#6b7280]">{item.summary || "OkulBlog’dan güncel eğitim duyurusu."}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#2864d8]">Oku <ArrowRight size={14} /></span></div></button>)}</div> : <div className="mt-10 grid gap-5 md:grid-cols-3">{["Sınav ve başvuru duyuruları", "Yeni kaynaklar ve dokümanlar", "Güncel test ve ders içerikleri"].map(title => <div key={title} className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-[0_8px_20px_rgba(31,41,55,.04)]"><div className="grid h-36 place-items-center rounded-2xl bg-[#eef5ff] text-[#8bb7ed]"><Megaphone size={30} /></div><h3 className="mt-5 text-lg font-extrabold text-[#111827]">{title}</h3><p className="mt-2 text-sm text-[#6b7280]">Yakında yayınlanacak güncel içerikleri burada görebilirsiniz.</p></div>)}</div>}</div></section>

        
        <section id="sss" className="bg-white py-16 sm:py-20"><div className="container"><div className="mx-auto max-w-2xl text-center"><p className="editorial-kicker text-[#5540e8]">Yardım merkezi</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-[#111827] sm:text-4xl">Sıkça sorulan sorular</h2><p className="mt-3 text-sm text-[#6b7280]">OkulBlog’u kullanmaya başlarken en çok merak edilen kısa cevaplar.</p></div><div className="mx-auto mt-10 max-w-3xl"><label className="relative block"><span className="sr-only">SSS içinde ara</span><Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8c9aa0]" /><input value={faqQuery} onChange={event => setFaqQuery(event.target.value)} placeholder="Sorularda ara..." className="h-12 w-full rounded-2xl border border-[#e5e7eb] bg-[#fafaff] pl-11 pr-4 text-sm font-medium text-[#17354d] outline-none transition focus:border-[#5540e8] focus:ring-2 focus:ring-[#5540e8]/20" /></label><div className="mt-5 space-y-3">{faqItems.filter(item => `${item.question} ${item.answer}`.toLocaleLowerCase("tr-TR").includes(faqQuery.toLocaleLowerCase("tr-TR").trim())).map(item => <details key={item.question} className="group rounded-2xl border border-[#e5e7eb] bg-[#fafaff] p-5"><summary className="cursor-pointer list-none pr-8 font-bold text-[#17354d] outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-[#5540e8]">{item.question}<ChevronRight className="float-right transition-transform group-open:rotate-90" size={18} /></summary><p className="mt-3 max-w-2xl text-sm leading-6 text-[#71838b]">{item.answer}</p></details>)}{faqItems.every(item => !`${item.question} ${item.answer}`.toLocaleLowerCase("tr-TR").includes(faqQuery.toLocaleLowerCase("tr-TR").trim())) && <p className="rounded-2xl border border-dashed border-[#d8dfe0] bg-[#fafaff] p-5 text-center text-sm text-[#71838b]">Aramanızla eşleşen bir soru bulunamadı.</p>}</div></div></div></section>
      </main>

      <footer className="bg-[#111827] text-white"><div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4"><div><div className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#5540e8] text-white"><GraduationCap size={18} /></span> okul<span className="text-[#ffd21a]">blog</span></div><p className="mt-4 max-w-xs text-sm leading-6 text-[#9ca3af]">Öğrencilerin sınav yolculuğunda güvenilir içerik ve düzenli öğrenme alanı.</p></div><div><h3 className="font-bold">Keşfet</h3><div className="mt-4 grid gap-3 text-sm text-[#9ca3af]"><button onClick={() => goTo("icerikler")} className="text-left transition hover:text-white">Tüm dersler</button><button onClick={() => goTo("egitim-seviyeleri")} className="text-left transition hover:text-white">Sınıf seçimi</button><button onClick={() => goTo("sinavlar")} className="text-left transition hover:text-white">Sınav alanı</button></div></div><div><h3 className="font-bold">Destek</h3><div className="mt-4 grid gap-3 text-sm text-[#9ca3af]"><button onClick={() => setLocation("/soru-cevap")} className="text-left transition hover:text-white">Soru-Cevap</button><button onClick={() => setLocation("/soru-cevap#iletisim")} className="text-left transition hover:text-white">İletişim</button><button onClick={openPanel} className="text-left transition hover:text-white">Yönetim Paneli</button></div></div><div><h3 className="font-bold">Bülten</h3><p className="mt-4 text-sm text-[#9ca3af]">Yeni içeriklerden haberdar ol.</p><div className="mt-3 flex"><input aria-label="E-posta" placeholder="E-posta" className="min-w-0 flex-1 rounded-l-xl border-0 bg-[#1f2937] px-3 py-2 text-sm text-white outline-none placeholder:text-[#6b7280] focus:ring-2 focus:ring-[#5540e8]" /><button aria-label="Bültene katıl" className="rounded-r-xl bg-[#5540e8] px-4 text-white transition hover:bg-[#4632cf]"><ArrowRight size={16} /></button></div></div></div><div className="container border-t border-white/10 py-5 text-center text-xs text-[#6b7280]">© {new Date().getFullYear()} OkulBlog. Tüm hakları saklıdır.</div></footer>
      </div>
    </>
  );
}

type HomeCategoryNode = { id: number; name: string; level: string; parentId: number | null; isActive?: boolean };
type HomeContentItem = { id: number; title: string; categoryId?: number | null; contentType: string; status: string; createdAt?: string | number | Date };

export function classSummary(className: string, nodes: HomeCategoryNode[], items: HomeContentItem[]) {
  const classNode = nodes.find(node => node.level === "class" && node.name.toLocaleLowerCase("tr-TR") === className.toLocaleLowerCase("tr-TR"));
  if (!classNode) return { total: 0, counts: { test: 0, video: 0, document: 0, game: 0, simulation: 0, news: 0 }, previews: [] as HomeContentItem[] };
  const ids = categoryIdsForSelection(nodes as any, classNode.id) ?? new Set<number>();
  const scoped = items.filter(item => (item.status === "published" || item.status === "pending") && item.categoryId != null && ids.has(item.categoryId));
  const counts = { test: 0, video: 0, document: 0, game: 0, simulation: 0, news: 0 };
  scoped.forEach(item => { if (item.contentType in counts) counts[item.contentType as keyof typeof counts] += 1; });
  const previews = [...scoped].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).slice(0, 2);
  return { total: scoped.length, counts, previews };
}

function ClassCoverIllustration({ group }: { group: ReturnType<typeof classGroupForName> }) {
  const Icon = group.icon === "book" ? BookOpen : group.icon === "layers" ? Layers3 : group.icon === "graduation" ? GraduationCap : Target;
  const palette = group.key === "elementary" ? "from-[#38a98d] to-[#155d55]" : group.key === "middle" ? "from-[#3d88d8] to-[#24567b]" : group.key === "high" ? "from-[#8e5bc7] to-[#60447a]" : "from-[#d79b2b] to-[#7b4d0e]";
  return <div className={`relative flex h-24 items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br ${palette} text-white`} aria-hidden="true"><span className="absolute -right-4 -top-8 h-24 w-24 rounded-full border-[12px] border-white/15" /><span className="absolute -bottom-8 -left-3 h-20 w-20 rounded-full bg-white/10" /><Icon size={42} strokeWidth={1.6} /><span className="absolute bottom-2 left-3 text-[9px] font-extrabold tracking-[.12em]">{group.key === "elementary" ? "İLKOKUL 1–4" : group.key === "middle" ? "ORTAOKUL 5–8" : group.key === "high" ? "LİSE 9–12" : "EĞİTİM"}</span></div>;
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
