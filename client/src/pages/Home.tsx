import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
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
  { name: "Testler", detail: "Ölçme ve değerlendirme", icon: Target, accent: "bg-[#e7b354]", ink: "text-[#7b4d0e]" },
  { name: "Dokümanlar", detail: "Düzenli kaynak arşivi", icon: FileText, accent: "bg-[#b8ddd4]", ink: "text-[#155d55]" },
  { name: "Simülasyonlar", detail: "Görerek ve deneyerek öğren", icon: Layers3, accent: "bg-[#d8c8e8]", ink: "text-[#60447a]" },
  { name: "Videolar", detail: "Odaklı anlatımlar", icon: Video, accent: "bg-[#f3c7bd]", ink: "text-[#873d31]" },
  { name: "Oyunlar", detail: "Aktif tekrar deneyimi", icon: Gamepad2, accent: "bg-[#bcd5ee]", ink: "text-[#24567b]" },
  { name: "Haberler", detail: "Eğitimden seçili gündem", icon: BookOpen, accent: "bg-[#d6dfad]", ink: "text-[#536a1d]" },
];

const steps = [
  ["01", "Yolunu seç", "Sınıf, ders, ünite veya kurum sınavı odağını belirle."],
  ["02", "Doğru içeriğe gir", "Testler, dokümanlar ve diğer öğrenme araçlarına ulaş."],
  ["03", "Çalışmanı sürdür", "Tekrarla, ölç, geri dön ve hedefini görünür tut."],
];

function getSlideNavigation(link: string | null | undefined) {
  const target = (link ?? "#icerikler").trim() || "#icerikler";
  if (target.startsWith("#")) return { kind: "anchor" as const, target };
  if (target.startsWith("/")) return { kind: "internal" as const, target };
  return { kind: "external" as const, target };
}

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const homeSlides = trpc.platform.homeSlides.useQuery();
  const overview = trpc.platform.overview.useQuery();
  const popularEducationCategories = trpc.platform.popularEducationCategories.useQuery();
  const educationCategories = overview.data?.educationCategories ?? [];
  const configuredPopularCategories = popularEducationCategories.data ?? [];
  const displayedEducationCategories = configuredPopularCategories.length ? configuredPopularCategories : educationCategories.slice(0, 6);
  const selectedCategory = educationCategories.find(category => category.id === selectedCategoryId);
  const filteredContent = trpc.platform.contentByCategory.useQuery(
    { categoryId: selectedCategoryId ?? 1 },
    { enabled: selectedCategoryId !== null }
  );
  const configuredSlides = homeSlides.data ?? [];
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
    <div className="min-h-screen overflow-x-hidden bg-[#f7f4ed] text-[#102e49]">
      <header className="sticky top-0 z-50 border-b border-[#dfe0d8]/80 bg-[#f7f4ed]/95 backdrop-blur-xl">
        <div className="container flex h-[76px] items-center justify-between gap-5">
          <button onClick={() => goTo("baslangic")} className="flex items-center gap-2.5 text-left" aria-label="OkulBlog ana sayfa">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#102e49] text-[#f2c866] shadow-[0_9px_20px_rgba(16,46,73,.17)]"><GraduationCap size={21} /></span>
            <span className="text-[21px] font-bold tracking-[-.06em] text-[#102e49]">okul<span className="font-serif text-[#bd8331]">blog</span></span>
          </button>

          <nav className="hidden items-center gap-8 text-sm font-bold text-[#516674] md:flex">
            <button onClick={() => goTo("icerikler")} className="transition-colors hover:text-[#102e49]">İçerikler</button>
            <button onClick={() => goTo("yolculuk")} className="transition-colors hover:text-[#102e49]">Nasıl çalışır?</button>
            <button onClick={() => goTo("sinavlar")} className="transition-colors hover:text-[#102e49]">Sınav hazırlığı</button>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button onClick={accountAction} variant="ghost" className="font-bold text-[#28445a] hover:bg-[#ecece2]">{isAuthenticated ? "Panelim" : "Giriş yap"}</Button>
            <Button onClick={accountAction} className="h-11 rounded-full bg-[#102e49] px-5 font-bold text-white shadow-[0_10px_20px_rgba(16,46,73,.15)] hover:bg-[#1b425f] active:scale-[.97]">
              {isAuthenticated ? "Panele git" : "Başla"}<ArrowRight size={16} />
            </Button>
          </div>

          <button onClick={() => setMenuOpen(value => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#d8dcd6] bg-white md:hidden" aria-label="Menüyü aç">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        {menuOpen && <div className="border-t border-[#dedfd7] bg-[#f7f4ed] px-4 py-4 md:hidden"><div className="grid gap-1"><button onClick={() => goTo("icerikler")} className="rounded-xl px-4 py-3 text-left font-bold hover:bg-white">İçerikler</button><button onClick={() => goTo("yolculuk")} className="rounded-xl px-4 py-3 text-left font-bold hover:bg-white">Nasıl çalışır?</button><button onClick={() => goTo("sinavlar")} className="rounded-xl px-4 py-3 text-left font-bold hover:bg-white">Sınav hazırlığı</button><Button onClick={accountAction} className="mt-2 bg-[#102e49]">{loading ? "Yükleniyor..." : isAuthenticated ? "Panele git" : "Giriş yap"}</Button></div></div>}
      </header>

      <main>
        <section id="baslangic" className="relative overflow-hidden bg-[#102e49] text-white">
          <div className="pointer-events-none absolute inset-0 opacity-[.08]" style={{ backgroundImage: "radial-gradient(#f6d881 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="pointer-events-none absolute -right-36 top-[-13rem] h-[36rem] w-[36rem] rounded-full border-[62px] border-[#e5ae55]/20" />
          <div className="container relative grid gap-12 py-16 sm:py-20 lg:min-h-[650px] lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:py-24">
            <div className="max-w-2xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3.5 py-2 text-[11px] font-bold tracking-[.12em] text-[#f6d47f] uppercase"><Sparkles size={14} /> {currentSlide.eyebrow || "Eğitim için düzenli bir alan"}</div>
              <h1 className="max-w-2xl text-[3.35rem] font-semibold leading-[.92] tracking-[-.073em] sm:text-7xl lg:text-[5.45rem]">{currentSlide.title}</h1>
              <p className="mt-8 max-w-lg text-base leading-7 text-[#c4d1d3] sm:text-lg">{currentSlide.description || fallbackSlide.description}</p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button onClick={followSlideLink} size="lg" className="h-13 rounded-full bg-[#f2c866] px-6 font-bold text-[#1b354c] hover:bg-[#f7d982]">{currentSlide.buttonLabel || "İçerikleri keşfet"} <ArrowDownRight size={18} /></Button>
                <Button onClick={() => goTo("yolculuk")} variant="outline" size="lg" className="h-13 rounded-full border-white/25 bg-white/[.03] px-6 font-bold text-white hover:bg-white/10 hover:text-white"><PlayCircle size={18} /> Nasıl çalışır?</Button>
              </div>
              {configuredSlides.length > 1 && <div className="mt-8 flex items-center gap-2" aria-label="Slider seçimi">{configuredSlides.map((slide, index) => <button key={slide.id} onClick={() => setActiveSlideIndex(index)} className={`h-2.5 rounded-full transition-all ${index === activeSlideIndex ? "w-8 bg-[#f2c866]" : "w-2.5 bg-white/35 hover:bg-white/60"}`} aria-label={`${index + 1}. slide: ${slide.title}`} />)}</div>}
              <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-[#b6c7c9]"><span>• Kazanım odaklı</span><span>• Rol tabanlı</span><span>• Yapay zekâ destekli</span></div>
            </div>

            <div className="relative mx-auto w-full max-w-[510px] lg:translate-y-2">
              <div className="absolute -left-5 top-20 h-48 w-48 rounded-full bg-[#c9e4dc]/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[#f8f5ed] p-4 text-[#15344e] shadow-[0_28px_80px_rgba(0,0,0,.23)] sm:p-5">
                <div className="flex items-center justify-between border-b border-[#e1e2d9] pb-4"><div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#cce9df] text-[#176559]"><Search size={17} /></span><div><p className="text-sm font-bold">Öğrenme yolu</p><p className="text-[11px] text-[#75838a]">Adım adım keşfet</p></div></div><span className="rounded-full bg-[#f5e4b6] px-3 py-1 text-[10px] font-bold text-[#855f20]">AKILLI SEÇİM</span></div>
                <div className="mt-4 rounded-[22px] bg-[#153b58] p-5 text-white"><p className="text-[10px] font-bold tracking-[.16em] text-[#a9c9c4] uppercase">Eğitim kategorisi</p><p className="mt-2 text-xl font-semibold tracking-[-.03em]">Türkçe · 1. Sınıf</p><div className="mt-5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[#e7eff0]"><span className="rounded-md bg-white/10 px-2 py-1">Ders</span><ChevronRight size={12} className="text-[#85aa9f]" /><span className="rounded-md bg-white/10 px-2 py-1">Ünite</span><ChevronRight size={12} className="text-[#85aa9f]" /><span className="rounded-md bg-[#e8b75e] px-2 py-1 text-[#19384f]">Kazanım</span></div></div>
                <div className="mt-3 grid grid-cols-3 gap-2"><MiniTile icon={FileText} label="Doküman" tone="bg-[#e6f1ec] text-[#286b5e]" /><MiniTile icon={Target} label="Test" tone="bg-[#fbefd3] text-[#8f6621]" /><MiniTile icon={BrainCircuit} label="AI çalışma" tone="bg-[#ece8f7] text-[#604985]" /></div>
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-[#e3e5dc] bg-white px-4 py-3"><div><p className="text-xs font-bold">Sıradaki çalışma</p><p className="mt-0.5 text-[11px] text-[#77858a]">Okuduğunu anlama</p></div><ArrowRight size={17} className="text-[#739b90]" /></div>
              </div>
              <div className="absolute -bottom-5 -right-3 rounded-2xl bg-[#e8b85d] px-4 py-3 text-[#2b4050] shadow-xl sm:-right-9"><p className="text-[10px] font-bold tracking-[.12em] uppercase">Odak</p><p className="mt-1 text-sm font-bold">Bir hedef. Bir yol.</p></div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#dfdfd5] bg-[#f7f4ed]"><div className="container grid gap-5 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center"><p className="text-sm font-bold text-[#24435b]">Nereden başlamak istersiniz?</p><div className="hidden h-px bg-[#d9ddd5] sm:block" /><div className="flex flex-wrap gap-2"><button onClick={() => goTo("icerikler")} className="rounded-full border border-[#d8dcd5] bg-white px-4 py-2 text-xs font-bold text-[#466170] transition hover:border-[#9abbb1] hover:text-[#155e55]">Okul dersleri</button><button onClick={() => goTo("sinavlar")} className="rounded-full border border-[#d8dcd5] bg-white px-4 py-2 text-xs font-bold text-[#466170] transition hover:border-[#9abbb1] hover:text-[#155e55]">Kurum sınavları</button></div></div></section>

        <section id="egitim-seviyeleri" className="border-b border-[#e0e1d9] bg-[#f7f4ed] py-16 sm:py-20"><div className="container"><div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="editorial-kicker text-[#5c877e]">Eğitim yolunu seç</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em] text-[#102e49] sm:text-4xl">Kendi seviyende keşfet.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7d82]">İlkokuldan liseye, çalışma düzenini sana en uygun öğrenme alanıyla başlat.</p></div><span className="rounded-full border border-[#d9e2dc] bg-white px-4 py-2 text-xs font-bold text-[#568078]">1–12. sınıflar</span></div><div className="grid gap-4 lg:grid-cols-3"><LevelCard eyebrow="İLKOKUL" title="Keşfederek öğren" description="Temel beceriler, renkli etkinlikler ve eğlenceli öğrenme deneyimi." tone="peach" slice="left" grades={["1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf"]} tags={["Türkçe", "Matematik", "Hayat Bilgisi"]} onClick={accountAction} /><LevelCard eyebrow="ORTAOKUL" title="Bilgini güçlendir" description="Konu anlatımı, soru bankası ve sınav odaklı ilerleme alanı." tone="lavender" slice="center" grades={["5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf"]} tags={["Fen", "Sosyal", "LGS Hazırlık"]} onClick={accountAction} /><LevelCard eyebrow="LİSE" title="Hedefine hazırlan" description="9–12. sınıf dersleri ve üniversite sınavına hazırlık tek merkezde." tone="sky" slice="right" grades={["9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf"]} tags={["TYT", "AYT", "Denemeler"]} onClick={accountAction} /></div><div className="mt-5 grid gap-px overflow-hidden rounded-[24px] border border-[#e0e4df] bg-[#e0e4df] sm:grid-cols-4"><QuickStat icon="🎓" title="1–12" detail="Tüm sınıf seviyeleri" /><QuickStat icon="🎯" title="LGS" detail="Hedef odaklı hazırlık" /><QuickStat icon="📘" title="TYT · AYT" detail="Sınav çalışma alanı" /><QuickStat icon="📈" title="360°" detail="Gelişim ve raporlama" /></div></div></section>

        <section id="populer-kategoriler" className="border-b border-[#e0e1d9] bg-[#f7f4ed] py-16 sm:py-20"><div className="container"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="editorial-kicker text-[#5c877e]">Hızlı başlangıç</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em] text-[#102e49] sm:text-4xl">Popüler eğitim kategorileri</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7d82]">Öğrenme yolunuza en sık kullanılan başlangıç noktalarından biriyle devam edin.</p></div><button onClick={() => goTo("icerikler")} className="inline-flex items-center gap-2 self-start text-sm font-bold text-[#356f68] transition hover:text-[#102e49] sm:self-auto">Tüm içerikleri gör <ArrowRight size={16} /></button></div>{overview.isLoading ? <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[132px] animate-pulse rounded-[22px] border border-[#e1e2da] bg-white/70" />)}</div> : overview.isError ? <div className="mt-8 rounded-[22px] border border-[#ead6c9] bg-[#fff8f1] p-6 text-sm text-[#8a5a43]">Kategoriler şu anda yüklenemiyor. Lütfen biraz sonra tekrar deneyin.</div> : educationCategories.length === 0 ? <div className="mt-8 rounded-[22px] border border-dashed border-[#c9d6cf] bg-white/60 p-7 text-sm text-[#6b7d82]">Henüz eğitim kategorisi eklenmedi. Admin panelinden İlkokul veya Ortaokul kategorisi oluşturarak bu alanı doldurabilirsiniz.</div> : displayedEducationCategories.length === 0 ? <div className="mt-8 rounded-[22px] border border-dashed border-[#c9d6cf] bg-white/60 p-7 text-sm text-[#6b7d82]">Admin henüz ana sayfa için popüler kategori seçmedi.</div> : <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{displayedEducationCategories.map((category) => <PopularCategory key={category.id} icon={categoryIcon(category.name)} label={category.name} detail={categoryLevelLabel(category.level)} tone={categoryTone(category.id)} ink={categoryInk(category.id)} active={selectedCategoryId === category.id} onClick={() => { setSelectedCategoryId(category.id); window.setTimeout(() => goTo("kategori-sonuclar"), 0); }} />)}</div>}</div></section>

        {selectedCategory && <section id="kategori-sonuclar" className="container pt-8 scroll-mt-24" aria-live="polite"><div className="rounded-[26px] border border-[#cfe0d9] bg-[#eef6f1] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#5c877e]">Seçili öğrenme yolu</p><h3 className="mt-1 text-xl font-bold tracking-[-.035em] text-[#17354d]">{selectedCategory.name}</h3></div><button onClick={() => setSelectedCategoryId(null)} className="self-start text-sm font-bold text-[#356f68] underline underline-offset-4">Temizle</button></div>{filteredContent.isLoading ? <div className="mt-5 h-20 animate-pulse rounded-2xl bg-white/70" /> : filteredContent.isError ? <p className="mt-5 rounded-2xl bg-[#fff8f1] p-4 text-sm text-[#8a5a43]">Bu kategoriye ait içerikler şu anda yüklenemiyor.</p> : filteredContent.data?.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{filteredContent.data.slice(0, 4).map(item => <button key={item.id} onClick={accountAction} className="group rounded-2xl border border-[#d8e6de] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(16,46,73,.06)]"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#e7f2ec] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#397267]">{contentTypeLabel(item.contentType)}</span><ArrowRight size={15} className="text-[#8aa99e] transition-transform group-hover:translate-x-1" /></div><p className="mt-3 font-bold text-[#17354d]">{item.title}</p>{item.summary && <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#71828a]">{item.summary}</p>}</button>)}</div> : <p className="mt-5 rounded-2xl border border-dashed border-[#c9d6cf] bg-white/60 p-4 text-sm text-[#6b7d82]">Bu kategoriye henüz içerik eklenmemiş. Admin veya Öğretmen panelinden bu kategoriye bağlı içerik oluşturabilirsiniz.</p>}</div></section>}

        <section id="icerikler" className="container py-20 sm:py-28">
          <div className="grid gap-7 lg:grid-cols-[.82fr_1.18fr] lg:items-end"><div><p className="editorial-kicker text-[#5c877e]">İçerik alanları</p><h2 className="mt-4 max-w-md text-4xl font-semibold leading-[.98] tracking-[-.058em] text-[#102e49] sm:text-6xl">Tek arayüz.<br /><span className="font-serif italic text-[#b77a29]">Altı farklı</span> çalışma biçimi.</h2></div><p className="max-w-xl border-l-2 border-[#e0b65f] pl-5 text-base leading-7 text-[#617783]">İhtiyacınız olan materyale ulaşmak için hangi kapıdan gireceğinizi bilmeniz yeterli. Her alan, aynı kategori düzeniyle çalışır.</p></div>
          <div className="mt-10 overflow-hidden rounded-[24px] border border-white/80 bg-white/60 shadow-[0_10px_26px_rgba(61,77,91,.05)]"><img src="/manus-storage/okulblog-content-objects_30ab916b.png" alt="OkulBlog içerik alanlarını temsil eden 3D eğitim objeleri" className="h-24 w-full object-cover sm:h-32" /></div>
          <div className="mt-6 grid gap-px overflow-hidden rounded-[26px] border border-[#dfe1d9] bg-[#dfe1d9] sm:grid-cols-2 lg:grid-cols-3">{contentAreas.map(({ name, detail, icon: Icon, accent, ink }) => <button key={name} onClick={accountAction} className="group min-h-[220px] bg-[#fbfaf6] p-6 text-left transition duration-200 hover:bg-white"><div className="flex items-start justify-between"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${accent} ${ink}`}><Icon size={21} /></span><ArrowRight size={18} className="text-[#a3afb0] transition-transform group-hover:translate-x-1 group-hover:text-[#102e49]" /></div><h3 className="mt-14 text-2xl font-bold tracking-[-.045em] text-[#17354d]">{name}</h3><p className="mt-2 text-sm text-[#71828a]">{detail}</p></button>)}</div>
        </section>

        <section id="sinavlar" className="border-y border-[#dae0d8] bg-[#dcece6]"><div className="container grid gap-10 py-20 sm:py-24 lg:grid-cols-[1fr_.94fr] lg:items-center"><div><p className="editorial-kicker text-[#4a786d]">Kurum kategorisi</p><h2 className="mt-4 max-w-xl text-4xl font-semibold leading-[.99] tracking-[-.055em] text-[#12364f] sm:text-5xl">Sınav hazırlığı, okul akışından bağımsız hareket eder.</h2><p className="mt-6 max-w-lg leading-7 text-[#4d6d70]">KPSS ve kamu kurumu sınavları için alt kategori yapısı, aktif/pasif yönetim ve ilgili içeriklerinizi ayrı bir alanda düzenleyin.</p><Button onClick={accountAction} className="mt-8 rounded-full bg-[#12364f] px-6 font-bold text-white hover:bg-[#214c66]">Sınav alanına git <ArrowRight size={16} /></Button></div><div className="rounded-[28px] border border-white/80 bg-[#f7f5ed] p-6 shadow-[0_18px_35px_rgba(33,78,74,.1)] sm:p-8"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#153b58] text-[#f1c867]"><BookOpen size={21} /></span><span className="rounded-full bg-[#e2f0eb] px-3 py-1.5 text-[10px] font-bold text-[#2f6c5d]">BAĞIMSIZ YAPI</span></div><div className="mt-9 space-y-2">{["Kurum Kategorisi", "Alt Kategori", "İçerik ve Soru Havuzu"].map((item, index) => <div className="flex items-center gap-3" key={item}><span className="grid h-7 w-7 place-items-center rounded-full bg-[#dcece6] text-xs font-bold text-[#28685c]">{index + 1}</span><div className="flex flex-1 items-center justify-between rounded-xl border border-[#e2e4dd] bg-white px-4 py-3 text-sm font-bold text-[#29475b]"><span>{item}</span>{index < 2 && <ChevronRight size={15} className="text-[#82a69e]" />}</div></div>)}</div></div></div></section>

        <section id="yolculuk" className="container py-20 sm:py-28"><div className="rounded-[32px] bg-[#102e49] px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-14"><div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]"><div><p className="editorial-kicker text-[#a8cfc5]">Çalışma düzeni</p><h2 className="mt-4 text-4xl font-semibold leading-[.98] tracking-[-.055em] sm:text-5xl">Daha az karmaşa.<br /><span className="font-serif italic text-[#f2c866]">Daha çok odak.</span></h2><p className="mt-6 max-w-sm leading-7 text-[#c0d0d3]">OkulBlog, içerik üretiminden çalışmaya kadar her adımı izlenebilir bir eğitim yoluna bağlar.</p></div><div className="grid gap-3">{steps.map(([number, title, text]) => <div key={number} className="grid grid-cols-[42px_1fr_auto] gap-3 rounded-2xl border border-white/10 bg-white/[.055] p-5 sm:grid-cols-[55px_1fr_auto] sm:items-center"><span className="font-serif text-2xl italic text-[#f2c866]">{number}</span><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-[#b9c9cc]">{text}</p></div><ArrowRight size={17} className="text-[#83ada5]" /></div>)}</div></div></div></section>
      </main>

      <footer className="border-t border-[#dfe1d9] bg-[#efede5]"><div className="container flex flex-col gap-3 py-8 text-sm text-[#66777d] sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 font-bold text-[#244259]"><GraduationCap size={18} className="text-[#b77a29]" /> okulblog</div><p>İçerik, ölçme ve öğrenme için düzenli bir alan.</p><p>© {new Date().getFullYear()} OkulBlog</p></div></footer>
    </div>
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
