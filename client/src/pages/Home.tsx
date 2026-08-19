import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getHomeLoaderDelay } from "@/lib/homeLoading";
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
  if (/^https?:\/\//i.test(target)) return { kind: "external" as const, target };
  return { kind: "anchor" as const, target: `#${target}` };
}

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedContentType, setSelectedContentType] = useState("all");
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState<"elementary" | "middle" | "high">("middle");
  const [faqQuery, setFaqQuery] = useState("");
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [heroClassName, setHeroClassName] = useState("1. Sınıf");
  const [loaderStartedAt] = useState(() => Date.now());
  const [showLoader, setShowLoader] = useState(true);
  const [location, setLocation] = useLocation();
  const homeSlides = trpc.platform.homeSlides.useQuery();
  const overview = trpc.platform.overview.useQuery();
  const popularEducationCategories = trpc.platform.popularEducationCategories.useQuery();
  const educationCategories = overview.data?.educationCategories ?? [];
  const homepageStats = overview.data?.stats;
  const personalization = overview.data?.personalization;
  const personalPlan = personalization?.plan;
  const popularTopics = personalization?.popularTopics ?? [];
  const configuredPopularCategories = popularEducationCategories.data ?? [];
  const displayedEducationCategories = configuredPopularCategories.length ? configuredPopularCategories : educationCategories;
  const publishedContent = (overview.data?.content ?? []).filter(item => item.status === "published");
  const featuredContent = publishedContent.slice(0, 6);
  const subjectCards = displayedEducationCategories.filter(category => category.isActive !== false).slice(0, 6);
  const classNodes = (educationCategories as HomeCategoryNode[]).filter(node => node.level === "class" && node.isActive !== false).sort((a, b) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id));
  const visibleClassNodes = classNodes.filter(node => classLevelKey(node.name) === selectedSchoolLevel).slice(0, 4);
  const heroClassOptions = classNodes;
  const effectiveHeroClassName = heroClassOptions.some(node => node.name === heroClassName) ? heroClassName : (heroClassOptions[0]?.name ?? heroClassName);
  const heroLearning = getHeroLearningContext(educationCategories as HomeCategoryNode[], (overview.data?.content ?? []) as HomeContentItem[], effectiveHeroClassName);
  const newsItems = publishedContent.filter(item => item.contentType === "news").slice(0, 3);
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
    if (heroClassOptions.length && !heroClassOptions.some(node => node.name === heroClassName)) setHeroClassName(heroClassOptions[0].name);
  }, [heroClassName, heroClassOptions]);

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
  const miniHeroClassData = heroClassOptions.filter(node => node.name !== effectiveHeroClassName).slice(0, 2).map(node => ({ name: node.name, summary: classSummary(node.name, educationCategories as HomeCategoryNode[], (overview.data?.content ?? []) as HomeContentItem[]) }));

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
    const targetId = id.replace(/^#/, "");
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      <div className="min-h-screen overflow-x-hidden bg-[#f6f8fb] text-[#111827]">
      <header className="absolute inset-x-0 top-0 z-50 border-b border-white/10 bg-[#06172c]/90 text-white backdrop-blur-xl">
        <div className="container flex h-[78px] items-center justify-between gap-8">
          <button onClick={() => goTo("baslangic")} className="flex items-center gap-2.5 text-left" aria-label="OkulBlog ana sayfa">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f9f9a] text-white shadow-[0_9px_20px_rgba(15,159,154,.28)]"><GraduationCap size={21} /></span>
            <span className="text-[21px] font-bold tracking-[-.06em] text-white">okul<span className="font-serif text-[#7c3aed]">blog</span></span>
          </button>

            <nav className="hidden min-w-0 items-center justify-center gap-4 text-sm font-semibold text-white/85 lg:flex">
              {[['Dersler','/icerik/all'],['Testler','/icerik/test'],['Dokümanlar','/icerik/document'],['Videolar','/icerik/video'],['Soru-Cevap','/soru-cevap']].map(([label, path]) => <button key={path} onClick={() => setLocation(path)} className="whitespace-nowrap rounded-lg px-3 py-2 transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f9f9a]/70 active:scale-95">{label}</button>)}
            </nav>

          <div className="hidden items-center gap-4 md:flex"><div className="hidden h-11 w-[330px] items-center gap-2 rounded-xl border border-white/10 bg-white/[.08] px-3 text-white/70 lg:flex"><Search size={16} /><input aria-label="Ders, konu veya içerik ara" placeholder="Ders, konu veya içerik ara..." className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/45" onKeyDown={event => { if (event.key === "Enter" && event.currentTarget.value.trim()) setLocation(`/icerikler?search=${encodeURIComponent(event.currentTarget.value.trim())}`); }} /></div>
            <Button onClick={accountAction} variant="ghost" className="font-bold text-white hover:bg-white/10 hover:text-white">{isAuthenticated ? "Hesabım" : "Giriş Yap"}</Button>
            {!isAuthenticated && <Button onClick={accountAction} className="h-11 rounded-xl bg-[#0f9f9a] px-5 font-bold text-white shadow-[0_10px_20px_rgba(15,159,154,.2)] hover:bg-[#0b817e] active:scale-[.97]">Ücretsiz Başla <ArrowRight size={16} /></Button>}
          </div>

          <button onClick={() => setMenuOpen(value => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-white md:hidden" aria-label="Menüyü aç">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        {menuOpen && <div className="border-t border-white/10 bg-[#06172c] px-4 py-4 text-white md:hidden"><div className="grid gap-1">{[["Dersler", "/icerik/all"], ["Testler", "/icerik/test"], ["Dokümanlar", "/icerik/document"], ["Videolar", "/icerik/video"], ["Soru-Cevap", "/soru-cevap"]].map(([label, path]) => <button key={path} onClick={() => setLocation(path)} className="rounded-xl px-4 py-3 text-left font-bold transition-all duration-200 hover:translate-x-1 hover:bg-[#f4f2ff] hover:text-[#5540e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8]/40 active:scale-[.98]">{label}</button>)}<Button onClick={accountAction} className="mt-2 bg-[#0f9f9a]">{isAuthenticated ? "Hesabım" : "Ücretsiz Başla"}</Button></div></div>}
      </header>

      <div className="hidden">Üst Reklam (Google AdSense / Firma Reklamı)</div>

      <main>
        <section className="hidden relative min-h-[350px] overflow-hidden bg-[#2d55d9] text-white sm:h-[340px] sm:min-h-0 lg:h-[410px]" aria-label="Öne çıkan içerikler">
          <div className="absolute inset-0 bg-gradient-to-r from-[#1f5fe8] via-[#3f35c4] to-[#6322a0]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(242,200,102,.22),transparent_28%),radial-gradient(circle_at_82%_80%,rgba(184,221,212,.2),transparent_30%)]" />
          <div className="container relative flex h-full items-center justify-center px-12 py-8 text-center sm:px-6 sm:py-5">
            <div key={activeSlideIndex} className="hero-slide-content max-w-3xl">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#f6d47f]">{currentSlide.eyebrow || "OkulBlog öne çıkanları"}</p>
              <h2 className="text-2xl font-black leading-tight tracking-[-.055em] sm:text-4xl lg:text-5xl">{currentSlide.title}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#d5e0df] sm:text-base">{currentSlide.description || fallbackSlide.description}</p>
              <Button onClick={followSlideLink} className="mt-4 rounded-xl bg-[#ffd21a] px-7 font-black text-[#111827] shadow-[0_12px_30px_rgba(0,0,0,.18)] transition hover:-translate-y-0.5 hover:bg-[#ffe45b]">{currentSlide.buttonLabel || "İçerikleri keşfet"} <ArrowRight size={17} /></Button>
            </div>
          </div>
          <button type="button" onClick={() => setActiveSlideIndex(index => (index - 1 + Math.max(configuredSlides.length, 1)) % Math.max(configuredSlides.length, 1))} className="absolute bottom-4 left-3 top-auto grid h-10 w-10 translate-y-0 sm:left-4 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/35 focus:outline-none focus:ring-2 focus:ring-[#ffd21a]" aria-label="Önceki slayt"><ArrowRight className="rotate-180" size={20} /></button>
          <button type="button" onClick={() => setActiveSlideIndex(index => (index + 1) % Math.max(configuredSlides.length, 1))} className="absolute bottom-4 right-3 top-auto grid h-10 w-10 translate-y-0 sm:right-4 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/35 focus:outline-none focus:ring-2 focus:ring-[#f2c866]" aria-label="Sonraki slayt"><ArrowRight size={20} /></button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2" aria-label="Slayt seçimi">{(configuredSlides.length ? configuredSlides : [fallbackSlide]).map((slide, index) => <button type="button" key={"slider-dot-" + ("id" in slide ? slide.id : index)} onClick={() => setActiveSlideIndex(index)} className={`h-2.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[#f2c866] ${index === activeSlideIndex ? "w-8 bg-[#f2c866]" : "w-2.5 bg-white/45 hover:bg-white/80"}`} aria-label={`${index + 1}. slaytı göster`} />)}</div>
        </section>

        <section id="icerikler" className="hidden bg-[#fafaff] py-16 sm:py-20"><div className="container"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#5540e8]">Dersleri keşfet</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-[#111827] sm:text-4xl">Dersler için kapsamlı içerikler seni bekliyor.</h2><p className="mt-3 text-sm text-[#6b7280]">Gerçek eğitim kategorilerinden seçerek test, doküman, video ve daha fazlasına ulaş.</p></div>{overview.isLoading ? <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[185px] animate-pulse rounded-[24px] bg-white" />)}</div> : overview.isError ? <div className="mx-auto mt-10 max-w-5xl rounded-2xl bg-white p-6 text-sm text-[#6b7280]">Dersler şu anda yüklenemiyor.</div> : <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">{subjectCards.map((category, index) => { const Icon = categoryIcon(category.name); const group = category.level === "class" ? classGroupForName(category.name) : null; const GroupIcon = group?.icon === "book" ? BookOpen : group?.icon === "layers" ? Layers3 : group?.icon === "graduation" ? GraduationCap : group?.icon === "target" ? Target : null; const tones = ["from-[#2874ed] to-[#2364d7]", "from-[#a43ceb] to-[#7c2bd4]", "from-[#16b85b] to-[#0d9b49]", "from-[#ef3c3c] to-[#df2424]", "from-[#f1b900] to-[#d99400]", "from-[#df3a9b] to-[#c9217d]"]; const tone = group?.key === "elementary" ? "from-[#38a98d] to-[#20816f]" : group?.key === "middle" ? "from-[#3d88d8] to-[#24567b]" : group?.key === "high" ? "from-[#8e5bc7] to-[#60447a]" : tones[index % tones.length]; return <button key={category.id} onClick={() => { setSelectedCategoryId(category.id); setSelectedContentType("all"); updateFilterUrl(category.id, "all"); window.setTimeout(() => goTo("kategori-sonuclar"), 0); }} className="group overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white text-left shadow-[0_8px_20px_rgba(31,41,55,.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(85,64,232,.14)]"><div className={"relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br " + tone + " text-white"}>{group ? <img src={classCoverUrl(group.key)} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />{!group && (GroupIcon ? <GroupIcon size={42} strokeWidth={1.7} aria-hidden="true" /> : <Icon size={38} strokeWidth={1.7} />)}{group && <span className="absolute bottom-3 left-3 rounded-full bg-white/18 px-2.5 py-1 text-[10px] font-extrabold tracking-[.08em] text-white">{group.key === "elementary" ? "İLKOKUL 1–4" : group.key === "middle" ? "ORTAOKUL 5–8" : "LİSE 9–12"}</span>}</div><div className="p-5"><h3 className="text-lg font-extrabold text-[#111827]">{category.name}</h3><p className="mt-1 text-sm text-[#6b7280]">{categoryLevelLabel(category.level)}</p></div></button>; })}</div>}</div></section>

        <section id="baslangic" className="relative overflow-hidden bg-[#06172c] pt-[78px] text-white">
          <div className="pointer-events-none absolute inset-0 opacity-[.08]" style={{ backgroundImage: "radial-gradient(#f6d881 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          
          <div className="container relative grid gap-8 py-8 sm:gap-10 sm:py-12 lg:min-h-[400px] lg:grid-cols-[46%_54%] lg:items-center lg:py-8">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[.04] px-3.5 py-2 text-[11px] font-bold tracking-[.08em] text-white uppercase"><CheckCircle2 size={14} /> MEB müfredatıyla uyumlu</div>
              <h1 className="max-w-xl text-[2.8rem] font-semibold leading-[1.03] tracking-[-.055em] sm:text-5xl lg:text-[4.25rem]">Öğrenmenin en düzenli ve kolay yolu.</h1>
              <p className="mt-4 max-w-[590px] text-sm leading-6 text-[#c4d1d3] sm:text-lg sm:leading-7">Ders notları, testler, videolar ve soru çözümleri tek yerde. Sınıfını seç, hedefini belirle, hemen çalışmaya başla.</p>
              <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:gap-2.5">
                <Button onClick={() => goTo("egitim-seviyeleri")} size="lg" className="h-13 rounded-xl bg-[#0f9f9a] px-7 font-bold text-white shadow-[0_12px_28px_rgba(15,159,154,.22)] hover:bg-[#0b817e]">İçerikleri Keşfet <ArrowRight size={18} /></Button>
                <Button onClick={() => setShowHowItWorks(true)} variant="outline" size="lg" className="h-13 rounded-xl border-white/35 bg-transparent px-6 font-bold text-white hover:bg-white/10 hover:text-white"><PlayCircle size={18} /> Nasıl çalışır?</Button>
              </div>
              
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#b6c7c9]"><span>◉ Ücretsiz içerikler</span><span>◉ Kazanım odaklı</span><span>◉ Öğretmen onaylı</span></div>
            </div>

            <div className="relative mx-auto min-h-[390px] w-full max-w-[650px] lg:ml-auto lg:-translate-y-1">
              <img src="/manus-storage/okulblog-hero-book-pencil_762726b6.png" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-[-2px] right-[-2%] z-20 hidden w-[235px] select-none drop-shadow-[0_16px_18px_rgba(4,22,38,.2)] sm:block lg:w-[285px]" />
              <div className="pointer-events-none absolute -right-4 top-16 h-56 w-56 rounded-full bg-[#2c8d91]/20 blur-3xl" />
              <div className="absolute right-[6%] top-[8%] z-0 hidden w-[182px] rotate-[7deg] rounded-[18px] border border-white/60 bg-white/95 p-3 text-[#16324d] shadow-[0_18px_32px_rgba(15,39,62,.2)] sm:block">
                <p className="text-[10px] font-bold text-[#1668b5]">{miniHeroClassData[0]?.name ?? "Matematik"}</p>
                <div className="mt-3 flex items-center gap-2"><div className="grid h-12 w-12 place-items-center rounded-full border-[5px] border-[#dfeef1] border-t-[#1c83c7] text-[10px] font-black text-[#1c83c7]">{miniHeroClassData[0]?.summary.total ?? 0}</div><div className="min-w-0"><p className="truncate text-xs font-extrabold">{miniHeroClassData[0]?.summary.previews[0]?.title ?? "Yeni içerik"}</p><p className="mt-1 text-[10px] text-[#687b87]">{miniHeroClassData[0]?.summary.total ?? 0} içerik</p></div></div>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#0f8f8b]">Devam Et <ArrowRight size={12} /></span>
              </div>
              <div className="absolute right-[-1%] top-[28%] z-0 hidden w-[174px] rotate-[10deg] rounded-[18px] border border-white/60 bg-white/95 p-3 text-[#16324d] shadow-[0_18px_32px_rgba(15,39,62,.2)] sm:block">
                <p className="text-[10px] font-bold text-[#5540b5]">{miniHeroClassData[1]?.name ?? "Fen Bilimleri"}</p>
                <div className="mt-3 flex items-center gap-2"><div className="grid h-12 w-12 place-items-center rounded-full border-[5px] border-[#eeeafd] border-t-[#7055c9] text-[10px] font-black text-[#7055c9]">{miniHeroClassData[1]?.summary.total ?? 0}</div><div className="min-w-0"><p className="truncate text-xs font-extrabold">{miniHeroClassData[1]?.summary.previews[0]?.title ?? "Yeni içerik"}</p><p className="mt-1 text-[10px] text-[#687b87]">{miniHeroClassData[1]?.summary.total ?? 0} içerik</p></div></div>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#0f8f8b]">Devam Et <ArrowRight size={12} /></span>
              </div>
              <div className="relative z-10 mx-auto w-full max-w-[390px] rounded-[20px] border border-white/65 bg-white p-5 text-[#142f4a] shadow-[0_22px_48px_rgba(8,33,57,.28)] sm:mx-0 sm:ml-7 sm:max-w-[410px] sm:p-6">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e2f2eb] text-[#168b80]"><Target size={19} /></div><div><p className="text-base font-black tracking-[-.02em]">Bugünkü Çalışma Planın</p><p className="mt-0.5 text-[11px] text-[#78858d]">Gerçek ilerlemene göre hazırlandı</p></div></div>
                <div className="mt-5 flex items-center gap-4"><div className="relative grid h-[92px] w-[92px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#159c91 ${personalPlan?.progressPercent ?? 0}%, #e4f0ec 0)` }}><div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-white text-center"><strong className="text-[20px] font-black text-[#167e79]">%{personalPlan?.progressPercent ?? 0}</strong><span className="text-[9px] font-bold text-[#7b8d8d]">Tamamlandı</span></div></div><div className="min-w-0"><p className="text-sm font-black text-[#18324c]">{heroLearning.subjectName} · {heroLearning.className}</p><p className="mt-3 text-[11px] font-semibold text-[#8a969c]">Sıradaki Konu</p><p className="mt-1 truncate text-base font-black text-[#18324c]">{personalPlan?.title ?? "Çalışma planın"}</p><p className="mt-2 text-[11px] text-[#6f7e86]">{personalPlan ? "30 dk önerilen çalışma" : "Kişisel planını oluştur"}</p></div></div>
                <button type="button" onClick={() => personalPlan ? goTo("icerikler") : accountAction()} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0f9f9a] text-sm font-black text-white shadow-[0_10px_20px_rgba(15,159,154,.2)] transition hover:bg-[#0b817e]">Devam Et <ArrowRight size={18} /></button>
                <div className="mt-5 flex items-center gap-3 border-t border-[#edf0eb] pt-4"><div><p className="text-xs font-black text-[#388478]">{personalPlan ? "5 gün üst üste çalıştın!" : "Çalışma serine başla"}</p><p className="mt-0.5 text-[10px] text-[#73848a]">Harikasın! Devam et!</p></div><div className="ml-auto flex gap-1.5">{["P","S","Ç","P","C","C","P"].map((day, index) => <span key={day + index} className="grid h-5 w-5 place-items-center rounded-full border border-[#c9ded7] text-[8px] font-black text-[#55766f]">{index < (personalPlan ? 6 : 0) ? "✓" : day}</span>)}</div></div>
              </div>
            </div>          </div>
        </section>

        <section aria-label="Platform istatistikleri" className="relative z-10 -mt-8 bg-transparent"><div className="container grid overflow-hidden rounded-2xl border border-[#e2e8e7] bg-white px-5 py-4 shadow-[0_12px_34px_rgba(6,27,46,.08)] sm:grid-cols-2 lg:grid-cols-4 lg:px-6"><div className="flex min-h-[55px] items-center justify-center gap-3 border-b border-[#e2e8e7] py-2 sm:border-r lg:border-b-0"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf6f6] text-[#17466a]"><GraduationCap size={20} /></span><div><strong className="block text-lg font-black text-[#0b2942]">{homepageStats?.totalMembers ?? 0}</strong><span className="block text-xs text-[#64748b]">Öğrenci</span></div></div><div className="flex min-h-[55px] items-center justify-center gap-3 border-b border-[#e2e8e7] py-2 lg:border-r lg:border-b-0"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf6f6] text-[#17466a]"><FileText size={20} /></span><div><strong className="block text-lg font-black text-[#0b2942]">{homepageStats?.publishedContent ?? publishedContent.length}</strong><span className="block text-xs text-[#64748b]">İçerik</span></div></div><div className="flex min-h-[55px] items-center justify-center gap-3 border-b border-[#e2e8e7] py-2 sm:border-r sm:border-b-0"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf6f6] text-[#17466a]"><BookOpen size={20} /></span><div><strong className="block text-lg font-black text-[#0b2942]">{homepageStats?.activeEducationCategories ?? educationCategories.length}</strong><span className="block text-xs text-[#64748b]">Eğitim Kategorisi</span></div></div><div className="flex min-h-[55px] items-center justify-center gap-3 py-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf6f6] text-[#17466a]"><Sparkles size={20} /></span><div><strong className="block text-lg font-black text-[#0b2942]">{homepageStats?.publishedContent ? "Her gün" : "—"}</strong><span className="block text-xs text-[#64748b]">yeni içerik</span></div></div></div></section>

        <section id="egitim-seviyeleri" className="bg-[#f6f8fb] py-10 sm:py-14"><div className="container"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#0f8f8b]">Sınıfına uygun içerikleri keşfet</p><h2 className="mt-2 text-2xl font-black tracking-[-.045em] text-[#10233d] sm:text-3xl">Sınıfına uygun içerikleri keşfet</h2></div><div className="flex w-fit items-center gap-1 rounded-full border border-[#dce7e4] bg-white p-1 shadow-sm" role="tablist" aria-label="Eğitim seviyesi"><button type="button" role="tab" aria-selected={selectedSchoolLevel === "elementary"} onClick={() => setSelectedSchoolLevel("elementary")} className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${selectedSchoolLevel === "elementary" ? "bg-[#0f9f9a] text-white" : "text-[#526873] hover:bg-[#eef7f4]"}`}>İlkokul</button><button type="button" role="tab" aria-selected={selectedSchoolLevel === "middle"} onClick={() => setSelectedSchoolLevel("middle")} className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${selectedSchoolLevel === "middle" ? "bg-[#0f9f9a] text-white" : "text-[#526873] hover:bg-[#eef7f4]"}`}>Ortaokul</button><button type="button" role="tab" aria-selected={selectedSchoolLevel === "high"} onClick={() => setSelectedSchoolLevel("high")} className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${selectedSchoolLevel === "high" ? "bg-[#0f9f9a] text-white" : "text-[#526873] hover:bg-[#eef7f4]"}`}>Lise</button></div></div><div className="mx-auto mt-8 grid max-w-[1400px] items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{visibleClassNodes.map((classNode) => { const grade = classNode.name; const group = classGroupForName(grade); const summary = classSummary(grade, educationCategories as HomeCategoryNode[], (overview.data?.content ?? []) as HomeContentItem[]); const preview = summary.previews; const counts = Object.entries(summary.counts).filter(([, count]) => count > 0).slice(0, 3); return <div key={grade} className="group relative"><div role="link" tabIndex={0} onClick={() => setLocation(buildClassAllContentUrl(grade))} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setLocation(buildClassAllContentUrl(grade)); } }} aria-label={`${grade} içeriklerini gör`} className={`flex h-full min-h-[280px] w-full cursor-pointer flex-col rounded-[22px] border p-3 text-left shadow-[0_8px_20px_rgba(31,41,55,.04)] xl:min-h-[336px] transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(85,64,232,.14)] focus:outline-none focus:ring-2 focus:ring-[#5540e8] focus:ring-offset-2 ${group.classes}`}><ClassCoverIllustration group={group} grade={grade} /><div className="flex flex-1 flex-col px-2 pb-1 pt-3"><strong className="block text-sm font-extrabold text-[#17354d]">{grade}</strong><span className="mt-1 block text-[10px] font-bold uppercase tracking-[.1em] opacity-70">{summary.total} toplam içerik</span><div className="mt-auto flex flex-wrap gap-1.5 pt-5">{counts.length ? counts.map(([type, count]) => { const TypeIcon = contentTypeIcon(type); return <span key={type} className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold"><TypeIcon size={12} aria-hidden="true" />{contentTypeLabel(type)} {count}</span>; }) : <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold">İçerik keşfet</span>}</div></div></div><div className="pointer-events-none absolute left-2 right-2 top-full z-20 mt-2 translate-y-1 rounded-2xl border border-[#e4e8e3] bg-white p-3 opacity-0 shadow-[0_16px_32px_rgba(31,41,55,.14)] transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100"><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7b8a8d]">Yeni içerikler</p>{preview.length ? preview.map(item => <p key={item.id} className="mt-2 truncate text-xs font-bold text-[#29445a]">{item.title}</p>) : <p className="mt-2 text-xs text-[#7b8a8d]">Bu sınıfta henüz yayınlanmış içerik yok.</p>}<a href={buildClassAllContentUrl(grade)} onClick={event => event.stopPropagation()} className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#5540e8] px-3 py-2 text-[11px] font-extrabold text-white transition hover:bg-[#4632cf] focus:outline-none focus:ring-2 focus:ring-[#5540e8]/40">Tümünü Gör <ArrowRight size={13} aria-hidden="true" /></a></div></div>; })}</div><aside className="rounded-2xl border border-[#e2e8e7] bg-white p-5 shadow-[0_12px_34px_rgba(6,27,46,.08)] lg:sticky lg:top-6 lg:h-fit"><h3 className="text-lg font-black text-[#17354d]">Popüler Konular</h3>{popularTopics.slice(0, 3).map((topic, index) => <button key={topic.id} type="button" onClick={() => setLocation(`/icerikler?category=${topic.categoryId}`)} className="flex w-full items-center gap-3 border-t border-[#e2e8e7] py-4 text-left first:mt-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black text-white ${index === 0 ? "bg-[#0f9f9a]" : index === 1 ? "bg-[#f4b63e]" : "bg-[#7664d9]"}`}>{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#17354d]">{topic.name}</strong><small className="mt-1 block truncate text-[11px] text-[#64748b]">{topic.contentCount} içerik · gerçek etkileşim verisi</small></span><ChevronRight size={16} className="text-[#64748b]" /></button>)}<button type="button" onClick={() => goTo("icerikler")} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#e2e8e7] px-3 py-2.5 text-xs font-bold text-[#17354d] transition hover:border-[#0f9f9a] hover:text-[#0f8f8b]">Tüm konuları gör <ArrowRight size={14} /></button></aside></div></div></section>

        <section aria-label="Seçilmiş içerikler" className="bg-[#fafaff] py-12 sm:py-16"><div className="container"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#5540e8]">Senin için seçtiklerimiz</p><h2 className="mt-2 text-2xl font-black tracking-[-.04em] text-[#111827] sm:text-3xl">Senin için seçtiklerimiz</h2><p className="mt-2 text-sm text-[#6b7280]">Gerçek ilerlemene ve ilgi alanlarına göre seçildi.</p></div><button onClick={() => goTo("icerikler")} className="inline-flex items-center gap-2 self-start text-sm font-bold text-[#5540e8]">Tüm içerikleri gör <ArrowRight size={15} /></button></div>{featuredContent.length ? <div className="mt-7 grid items-stretch gap-4 md:grid-cols-3">{featuredContent.slice(0, 3).map(item => <button key={item.id} onClick={() => setLocation(`/icerik/${item.contentType}/${item.id}`)} className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-[#e5e7eb] bg-white text-left shadow-[0_8px_20px_rgba(31,41,55,.04)] transition hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(85,64,232,.12)]"><div className="h-36 overflow-hidden bg-gradient-to-br from-[#e7f2ec] to-[#eef2ff]">{item.coverImageUrl ? <img src={item.coverImageUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-[#739b90]"><FileText size={30} /></div>}</div><div className="flex flex-1 flex-col p-4"><span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#5540e8]">{contentTypeLabel(item.contentType)}</span><h3 className="mt-3 line-clamp-2 font-extrabold text-[#17354d]">{item.title}</h3>{item.summary && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#71828a]">{item.summary}</p>}</div></button>)}</div> : <div className="mt-7 rounded-2xl border border-dashed border-[#c9d6cf] bg-white p-6 text-center text-sm text-[#71828a]">Henüz yayınlanmış seçilmiş içerik bulunmuyor.</div>}</div></section>
        {selectedCategory && <section id="kategori-sonuclar" className="container scroll-mt-24 pt-8" aria-live="polite"><div className="rounded-[26px] border border-[#cfe0d9] bg-[#eef6f1] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#5c877e]">Seçili öğrenme yolu</p><h3 className="mt-1 text-xl font-bold tracking-[-.035em] text-[#17354d]">{selectedCategory.name}</h3></div><button onClick={() => { setSelectedCategoryId(null); setSelectedContentType("all"); updateFilterUrl(null, "all"); }} className="self-start text-sm font-bold text-[#356f68] underline underline-offset-4">Temizle</button></div><div className="mt-5 flex flex-wrap gap-2" aria-label="İçerik türü filtresi">{[{ value: "all", label: "Tümü" }, ...contentAreas.map(area => ({ value: area.value, label: area.name }))].map(filter => <button key={filter.value} type="button" onClick={() => { setSelectedContentType(filter.value); updateFilterUrl(selectedCategoryId, filter.value); }} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${selectedContentType === filter.value ? "border-[#5540e8] bg-[#5540e8] text-white" : "border-[#d8e6de] bg-white text-[#527068] hover:border-[#9abbb1]"}`}>{filter.label}</button>)}</div>{filteredContent.isLoading ? <div className="mt-5 h-20 animate-pulse rounded-2xl bg-white/70" /> : filteredContent.isError ? <p className="mt-5 rounded-2xl bg-[#fff8f1] p-4 text-sm text-[#8a5a43]">Bu kategoriye ait içerikler şu anda yüklenemiyor.</p> : visibleCategoryContent?.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{visibleCategoryContent.slice(0, 4).map(item => <button key={item.id} onClick={accountAction} className="group rounded-2xl border border-[#d8e6de] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(16,46,73,.06)]"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#e7f2ec] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#397267]">{contentTypeLabel(item.contentType)}</span><ArrowRight size={15} className="text-[#8aa99e] transition-transform group-hover:translate-x-1" /></div><p className="mt-3 font-bold text-[#17354d]">{item.title}</p>{item.summary && <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#71828a]">{item.summary}</p>}</button>)}</div> : <p className="mt-5 rounded-2xl border border-dashed border-[#c9d6cf] bg-white/60 p-4 text-sm text-[#6b7d82]">Bu filtrede henüz içerik bulunmuyor.</p>}</div></section>}


        <section id="nasil" className="bg-[#fffaf2] py-10 sm:py-12"><div className="container grid gap-10 lg:grid-cols-[1fr_1.25fr] lg:items-center"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#0f8f8b]">Neden OkulBlog?</p><h2 className="mt-3 text-3xl font-black tracking-[-.04em] text-[#17354d]">Çalışırken ihtiyacın olan her şey bir arada.</h2><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-[#e2e8e7] bg-white p-4"><strong className="block text-sm text-[#17354d]">Müfredata Uygun</strong><small className="mt-1 block text-xs leading-5 text-[#64748b]">Yayınlanan içerikler eğitim kategorileriyle uyumlu ilerler.</small></div><div className="rounded-2xl border border-[#e2e8e7] bg-white p-4"><strong className="block text-sm text-[#17354d]">Adım Adım Öğren</strong><small className="mt-1 block text-xs leading-5 text-[#64748b]">Konu, ünite ve kazanım yolunu takip et.</small></div><div className="rounded-2xl border border-[#e2e8e7] bg-white p-4"><strong className="block text-sm text-[#17354d]">Anında Test Et</strong><small className="mt-1 block text-xs leading-5 text-[#64748b]">Test ve içerik türleriyle öğrenmeni pekiştir.</small></div><div className="rounded-2xl border border-[#e2e8e7] bg-white p-4"><strong className="block text-sm text-[#17354d]">İlerlemeni Takip Et</strong><small className="mt-1 block text-xs leading-5 text-[#64748b]">Üye olduğunda tamamlanma durumunu kaydet.</small></div></div></div><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#0f8f8b]">OkulBlog ile nasıl çalışırım?</p><div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#efd9b7] bg-white text-xl text-[#0f8f8b]"><GraduationCap /></div><strong className="mt-3 block text-sm text-[#17354d]">1. Sınıfını seç</strong></div><span className="hidden text-2xl text-[#d7a75c] sm:block">···</span><div className="text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#efd9b7] bg-white text-xl text-[#0f8f8b]"><Search /></div><strong className="mt-3 block text-sm text-[#17354d]">2. Konunu keşfet</strong></div><span className="hidden text-2xl text-[#d7a75c] sm:block">···</span><div className="text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#efd9b7] bg-white text-xl text-[#0f8f8b]"><CheckCircle2 /></div><strong className="mt-3 block text-sm text-[#17354d]">3. Çalışmaya başla</strong></div></div></div></div></section>

        <section aria-label="Yeni eklenen içerikler" className="bg-[#f7f9fa] py-10 sm:py-12"><div className="container"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-black tracking-[-.04em] text-[#17354d] sm:text-3xl">Yeni eklenen içerikler</h2><p className="mt-2 text-sm text-[#64748b]">Her hafta güncellenen ders notları, testler ve videolar.</p></div><button type="button" onClick={() => goTo("icerikler")} className="inline-flex items-center gap-2 text-sm font-bold text-[#078b87]">Tüm yeni içerikleri gör <ArrowRight size={15} /></button></div>{publishedContent.length > 3 ? <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{publishedContent.slice(3, 7).map(item => <button key={item.id} type="button" onClick={() => setLocation(`/icerik/${item.contentType}/${item.id}`)} className="overflow-hidden rounded-2xl border border-[#e2e8e7] bg-white text-left shadow-[0_12px_34px_rgba(6,27,46,.06)] transition hover:-translate-y-1"><div className="grid h-32 place-items-center overflow-hidden bg-gradient-to-br from-[#dff3fb] to-[#d9eee8]">{item.coverImageUrl ? <img src={item.coverImageUrl} alt="" className="h-full w-full object-cover" /> : <BookOpen size={42} className="text-[#0f8f8b]" />}</div><div className="p-4"><span className="rounded-md bg-[#e7f6f4] px-2 py-1 text-[10px] font-extrabold text-[#078b87]">{contentTypeLabel(item.contentType)}</span><h3 className="mt-3 line-clamp-2 text-sm font-extrabold text-[#17354d]">{item.title}</h3><small className="mt-2 block truncate text-xs text-[#64748b]">{item.summary ?? "Yayınlanmış OkulBlog içeriği"}</small></div></button>)}</div> : <div className="mt-7 rounded-2xl border border-dashed border-[#c9d6cf] bg-white p-7 text-center text-sm text-[#64748b]">Yeni eklenen içerikler burada görünecek.</div>}</div></section>

        <section className="bg-[#f7f9fa] pb-14 sm:pb-16"><div className="container grid gap-8 rounded-2xl bg-gradient-to-br from-[#061b2e] to-[#092c4a] p-7 text-white shadow-[0_15px_35px_rgba(6,27,46,.14)] sm:p-10 lg:grid-cols-2 lg:items-center"><div><h2 className="text-3xl font-black leading-tight tracking-[-.04em] sm:text-4xl">Hedefine düzenli çalışarak ulaş.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#cbd5e1]">Kişiselleştirilmiş çalışma planın ve ilerleme takibinle hedeflerine daha hızlı ve kolay ulaş.</p><Button onClick={accountAction} className="mt-6 rounded-xl bg-[#0f9f9a] font-bold hover:bg-[#078b87]">Ücretsiz Başla <ArrowRight size={16} /></Button></div><div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 text-[#17354d]"><div className="rounded-xl border border-[#e2e8e7] p-4"><small className="text-xs text-[#64748b]">Haftalık Seri</small><strong className="mt-1 block text-xl font-black text-[#078b87]">{personalPlan ? "Aktif" : "—"}</strong></div><div className="rounded-xl border border-[#e2e8e7] p-4"><small className="text-xs text-[#64748b]">Tamamlanan İçerik</small><strong className="mt-1 block text-xl font-black text-[#078b87]">{homepageStats?.completedProgress ?? 0}</strong></div><div className="rounded-xl border border-[#e2e8e7] p-4"><small className="text-xs text-[#64748b]">Başarı Oranı</small><strong className="mt-1 block text-xl font-black text-[#078b87]">{personalPlan ? `%${personalPlan.progressPercent}` : "—"}</strong></div><div className="rounded-xl border border-[#e2e8e7] p-4"><small className="text-xs text-[#64748b]">Bu hafta</small><strong className="mt-1 block text-xl font-black text-[#078b87]">{homepageStats?.testAttempts ?? 0}</strong></div></div></div></section>

        <section id="duyurular" className="bg-white py-12 sm:py-14"><div className="container"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#5540e8]">Güncel duyurular</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-[#111827] sm:text-4xl">Eğitim dünyasından en son haberler.</h2><p className="mt-3 text-sm text-[#6b7280]">OkulBlog’daki güncel içerikleri ve önemli gelişmeleri takip edin.</p></div><button onClick={() => setLocation("/icerik/news")} className="inline-flex items-center gap-2 self-start rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#5540e8] hover:text-[#5540e8]">Tüm haberleri gör <ArrowRight size={16} /></button></div>{newsItems.length ? <div className="mt-10 grid gap-5 md:grid-cols-3">{newsItems.map(item => <button key={item.id} onClick={() => setLocation("/icerik/news")} className="group overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white text-left shadow-[0_8px_20px_rgba(31,41,55,.04)] transition hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(85,64,232,.12)]"><div className="h-36 bg-[#eef5ff]">{item.coverImageUrl ? <img src={item.coverImageUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-[#8bb7ed]"><Megaphone size={30} /></div>}</div><div className="p-5"><span className="rounded-md bg-[#f0f5ff] px-2 py-1 text-[10px] font-bold text-[#2864d8]">GÜNCEL</span><h3 className="mt-4 line-clamp-2 text-lg font-extrabold text-[#111827]">{item.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-5 text-[#6b7280]">{item.summary || "OkulBlog’dan güncel eğitim duyurusu."}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#2864d8]">Oku <ArrowRight size={14} /></span></div></button>)}</div> : <div className="mt-10 grid gap-5 md:grid-cols-3">{["Sınav ve başvuru duyuruları", "Yeni kaynaklar ve dokümanlar", "Güncel test ve ders içerikleri"].map(title => <div key={title} className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-[0_8px_20px_rgba(31,41,55,.04)]"><div className="grid h-36 place-items-center rounded-2xl bg-[#eef5ff] text-[#8bb7ed]"><Megaphone size={30} /></div><h3 className="mt-5 text-lg font-extrabold text-[#111827]">{title}</h3><p className="mt-2 text-sm text-[#6b7280]">Yakında yayınlanacak güncel içerikleri burada görebilirsiniz.</p></div>)}</div>}</div></section>

        {showHowItWorks && <div className="fixed inset-0 z-[80] grid place-items-center bg-[#111827]/65 p-4" role="dialog" aria-modal="true" aria-labelledby="how-it-works-title" onClick={() => setShowHowItWorks(false)}><div className="relative w-full max-w-lg rounded-[26px] bg-white p-6 text-[#17354d] shadow-2xl" onClick={event => event.stopPropagation()}><button type="button" onClick={() => setShowHowItWorks(false)} aria-label="Nasıl çalışır penceresini kapat" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-[#71828a] transition hover:bg-[#f0f3f5] hover:text-[#17354d] focus:outline-none focus:ring-2 focus:ring-[#5540e8]"><X size={18} /></button><p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#5540e8]">OkulBlog öğrenme akışı</p><h2 id="how-it-works-title" className="mt-2 pr-10 text-2xl font-black tracking-[-.04em]">Nasıl çalışır?</h2><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#eef6f1] p-4"><span className="text-lg font-black text-[#397267]">1</span><p className="mt-2 text-sm font-bold">Sınıfını seç</p><p className="mt-1 text-xs leading-5 text-[#6b7d82]">MEB sırasındaki sınıf ve ders yolunu aç.</p></div><div className="rounded-2xl bg-[#f5f0ff] p-4"><span className="text-lg font-black text-[#604985]">2</span><p className="mt-2 text-sm font-bold">İçerik türünü seç</p><p className="mt-1 text-xs leading-5 text-[#6b7d82]">Test, video veya dokümanla çalış.</p></div><div className="rounded-2xl bg-[#fff7df] p-4"><span className="text-lg font-black text-[#8f6621]">3</span><p className="mt-2 text-sm font-bold">İlerlemeni takip et</p><p className="mt-1 text-xs leading-5 text-[#6b7d82]">Öğrendim/Tamamladım durumunu kaydet.</p></div></div><button type="button" onClick={() => { setShowHowItWorks(false); goTo("icerikler"); }} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#5540e8] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#4632cf] focus:outline-none focus:ring-2 focus:ring-[#5540e8]/40">İçerikleri keşfet <ArrowRight size={16} /></button></div></div>}

        <section id="sss" className="bg-white py-16 sm:py-20"><div className="container"><div className="mx-auto max-w-2xl text-center"><p className="editorial-kicker text-[#5540e8]">Yardım merkezi</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-[#111827] sm:text-4xl">Sıkça sorulan sorular</h2><p className="mt-3 text-sm text-[#6b7280]">OkulBlog’u kullanmaya başlarken en çok merak edilen kısa cevaplar.</p></div><div className="mx-auto mt-10 max-w-3xl"><label className="relative block"><span className="sr-only">SSS içinde ara</span><Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8c9aa0]" /><input value={faqQuery} onChange={event => setFaqQuery(event.target.value)} placeholder="Sorularda ara..." className="h-12 w-full rounded-2xl border border-[#e5e7eb] bg-[#fafaff] pl-11 pr-4 text-sm font-medium text-[#17354d] outline-none transition focus:border-[#5540e8] focus:ring-2 focus:ring-[#5540e8]/20" /></label><div className="mt-5 space-y-3">{faqItems.filter(item => `${item.question} ${item.answer}`.toLocaleLowerCase("tr-TR").includes(faqQuery.toLocaleLowerCase("tr-TR").trim())).map(item => <details key={item.question} className="group rounded-2xl border border-[#e5e7eb] bg-[#fafaff] p-5"><summary className="cursor-pointer list-none pr-8 font-bold text-[#17354d] outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-[#5540e8]">{item.question}<ChevronRight className="float-right transition-transform group-open:rotate-90" size={18} /></summary><p className="mt-3 max-w-2xl text-sm leading-6 text-[#71838b]">{item.answer}</p></details>)}{faqItems.every(item => !`${item.question} ${item.answer}`.toLocaleLowerCase("tr-TR").includes(faqQuery.toLocaleLowerCase("tr-TR").trim())) && <p className="rounded-2xl border border-dashed border-[#d8dfe0] bg-[#fafaff] p-5 text-center text-sm text-[#71838b]">Aramanızla eşleşen bir soru bulunamadı.</p>}</div></div></div></section>
      </main>

            <footer className="bg-[#111827] text-white"><div className="container grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-3"><div><div className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#5540e8] text-white"><GraduationCap size={18} /></span> okul<span className="text-[#ffd21a]">blog</span></div><p className="mt-4 max-w-xs text-sm leading-6 text-[#9ca3af]">Öğrencilerin sınav yolculuğunda güvenilir içerik ve düzenli öğrenme alanı.</p></div><div><h3 className="font-bold">Keşfet</h3><div className="mt-4 grid gap-3 text-sm text-[#9ca3af]"><button onClick={() => goTo("icerikler")} className="text-left transition hover:text-white">Tüm dersler</button><button onClick={() => goTo("egitim-seviyeleri")} className="text-left transition hover:text-white">Sınıf seçimi</button><button onClick={() => goTo("sinavlar")} className="text-left transition hover:text-white">Sınav alanı</button></div></div><div><h3 className="font-bold">Destek</h3><div className="mt-4 grid gap-3 text-sm text-[#9ca3af]"><button onClick={() => setLocation("/soru-cevap")} className="text-left transition hover:text-white">Soru-Cevap</button><button onClick={() => setLocation("/soru-cevap#iletisim")} className="text-left transition hover:text-white">İletişim</button><button onClick={openPanel} className="text-left transition hover:text-white">Yönetim Paneli</button></div></div></div><div className="container mb-8 rounded-[24px] bg-[#0f9f9a] px-6 py-7 text-white shadow-[0_12px_28px_rgba(15,159,154,.18)]"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-white/75">OkulBlog bülteni</p><h3 className="mt-1 text-xl font-black">Yeni içerikleri kaçırma.</h3></div><div className="flex w-full max-w-md"><input aria-label="E-posta" placeholder="E-posta adresin" className="min-w-0 flex-1 rounded-l-xl border-0 bg-white px-4 py-3 text-sm text-[#17354d] outline-none placeholder:text-[#7b8a8d]" /><button aria-label="Bültene katıl" className="rounded-r-xl bg-[#061b2e] px-5 text-sm font-extrabold text-white transition hover:bg-[#0a2f4f]">Abone Ol</button></div></div></div><div className="container border-t border-white/10 py-5 text-center text-xs text-[#6b7280]">© {new Date().getFullYear()} OkulBlog. Tüm hakları saklıdır.</div></footer>
      </div>
    </>
  );
}

type HomeCategoryNode = { id: number; name: string; level: string; parentId: number | null; isActive?: boolean; sortOrder?: number | null };
type HomeContentItem = { id: number; title: string; summary?: string | null; coverImageUrl?: string | null; categoryId?: number | null; contentType: string; status: string; createdAt?: string | number | Date };

export function classLevelKey(name: string): "elementary" | "middle" | "high" {
  const match = name.match(/(\d{1,2})/);
  const grade = match ? Number(match[1]) : 0;
  if (grade >= 1 && grade <= 4) return "elementary";
  if (grade >= 5 && grade <= 8) return "middle";
  return "high";
}

export function classSummary(className: string, nodes: HomeCategoryNode[], items: HomeContentItem[]) {
  const classNode = nodes.find(node => node.level === "class" && node.name.toLocaleLowerCase("tr-TR") === className.toLocaleLowerCase("tr-TR"));
  if (!classNode) return { total: 0, counts: { test: 0, video: 0, document: 0, game: 0, simulation: 0, news: 0 }, previews: [] as HomeContentItem[] };
  const ids = categoryIdsForSelection(nodes as any, classNode.id) ?? new Set<number>();
  const scoped = items.filter(item => item.status === "published" && item.categoryId != null && ids.has(item.categoryId));
  const counts = { test: 0, video: 0, document: 0, game: 0, simulation: 0, news: 0 };
  scoped.forEach(item => { if (item.contentType in counts) counts[item.contentType as keyof typeof counts] += 1; });
  const previews = [...scoped].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).slice(0, 2);
  return { total: scoped.length, counts, previews };
}

function ClassCoverIllustration({ group, grade }: { group: ReturnType<typeof classGroupForName>; grade: string }) {
  const palette = group.key === "elementary" ? "from-[#38a98d] to-[#155d55]" : group.key === "middle" ? "from-[#3d88d8] to-[#24567b]" : group.key === "high" ? "from-[#8e5bc7] to-[#60447a]" : "from-[#d79b2b] to-[#7b4d0e]";
  return <div className={`relative flex h-32 items-center justify-center overflow-hidden rounded-[20px] sm:h-36 bg-gradient-to-br ${palette} text-white`} aria-hidden="true"><img src={classCoverUrl(grade)} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" /><span className="absolute bottom-2 left-3 text-[9px] font-extrabold tracking-[.12em]">{grade}</span></div>;
}

export function classCoverUrl(classOrGroup: string) {
  const normalized = classOrGroup.toLocaleLowerCase("tr-TR");
  const gradeMatch = normalized.match(/(?:^|\s)([1-9]|1[0-2])\.?\s*sınıf/);
  const grade = gradeMatch?.[1] ? Number(gradeMatch[1]) : null;
  const gradeCovers: Record<number, string> = {
    1: "/manus-storage/okulblog-class-1_ddff878d.png",
    2: "/manus-storage/okulblog-class-2_83ef5649.png",
    3: "/manus-storage/okulblog-class-3_d4ca9990.png",
    4: "/manus-storage/okulblog-class-4_44db439d.png",
    5: "/manus-storage/okulblog-class-5_2d7f0c24.png",
    6: "/manus-storage/okulblog-class-6_458df8cf.png",
    7: "/manus-storage/okulblog-class-7_5004262f.png",
    8: "/manus-storage/okulblog-class-8_a532879e.png",
    9: "/manus-storage/okulblog-class-9_6e419029.png",
    10: "/manus-storage/okulblog-class-10_61c95399.png",
    11: "/manus-storage/okulblog-class-11_82a0f766.png",
    12: "/manus-storage/okulblog-class-12_dcd3336a.png",
  };
  if (grade && gradeCovers[grade]) return gradeCovers[grade];
  const groupCovers: Record<string, string> = {
    elementary: "/manus-storage/okulblog-ilkokul-cover_b82252f4.png",
    middle: "/manus-storage/okulblog-ortaokul-cover_e9f1b0af.png",
    high: "/manus-storage/okulblog-lise-cover_9d072c64.png",
  };
  return groupCovers[classOrGroup] ?? groupCovers.elementary;
}

export function buildClassAllContentUrl(grade: string) {
  return `/icerik/test?class=${encodeURIComponent(grade)}&contentType=all`;
}

export function buildClassTypeUrl(grade: string, contentType: string) {
  return `/icerik/${contentType === "document" ? "document" : contentType}?class=${encodeURIComponent(grade)}&contentType=${encodeURIComponent(contentType)}`;
}

export function getHeroLearningContext(nodes: HomeCategoryNode[], items: HomeContentItem[], preferredClassName?: string) {
  const classNodes = nodes.filter(node => node.level === "class").sort((a, b) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id));
  const preferred = preferredClassName?.toLocaleLowerCase("tr-TR");
  const classNode = (preferred ? classNodes.find(node => node.name.toLocaleLowerCase("tr-TR") === preferred) : undefined) ?? classNodes[0];
  const subjectNode = classNode ? nodes.filter(node => node.level === "subject" && node.parentId === classNode.id).sort((a, b) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id))[0] : undefined;
  const className = classNode?.name ?? "Sınıf seçimi";
  const summary = classNode ? classSummary(className, nodes, items) : { counts: { test: 0, video: 0, document: 0, game: 0, simulation: 0, news: 0 } };
  return { className, subjectName: subjectNode?.name ?? "Ders seçimi", counts: summary.counts };
}

function contentTypeLabel(type: string) {
  const labels: Record<string, string> = { test: "Test", document: "Doküman", simulation: "Simülasyon", video: "Video", game: "Oyun", news: "Haber" };
  return labels[type] ?? "İçerik";
}

function contentTypeIcon(type: string) {
  const icons: Record<string, typeof FileText> = { test: Target, document: FileText, video: Video, simulation: Layers3, game: Gamepad2, news: BookOpen };
  return icons[type] ?? FileText;
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
