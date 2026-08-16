import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getSlideNavigation } from "@/lib/homeSlide";
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

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [, setLocation] = useLocation();
  const homeSlides = trpc.platform.homeSlides.useQuery();
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

        <section id="populer-kategoriler" className="border-b border-[#e0e1d9] bg-[#f7f4ed] py-16 sm:py-20"><div className="container"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="editorial-kicker text-[#5c877e]">Hızlı başlangıç</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em] text-[#102e49] sm:text-4xl">Popüler eğitim kategorileri</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7d82]">Öğrenme yolunuza en sık kullanılan başlangıç noktalarından biriyle devam edin.</p></div><button onClick={() => goTo("icerikler")} className="inline-flex items-center gap-2 self-start text-sm font-bold text-[#356f68] transition hover:text-[#102e49] sm:self-auto">Tüm içerikleri gör <ArrowRight size={16} /></button></div><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><PopularCategory icon={GraduationCap} label="İlkokul" detail="Temel dersler ve kazanımlar" tone="bg-[#e5f1eb]" ink="text-[#2b7062]" onClick={() => goTo("icerikler")} /><PopularCategory icon={BookOpen} label="Ortaokul" detail="Ders, ünite ve konu akışı" tone="bg-[#e9e4f3]" ink="text-[#625087]" onClick={() => goTo("icerikler")} /><PopularCategory icon={Target} label="Türkçe" detail="Okuma, anlama ve dil bilgisi" tone="bg-[#fbefd3]" ink="text-[#90661e]" onClick={() => goTo("icerikler")} /><PopularCategory icon={BrainCircuit} label="Matematik" detail="Adım adım problem çözme" tone="bg-[#f4ddd8]" ink="text-[#8a4d42]" onClick={() => goTo("icerikler")} /><PopularCategory icon={Layers3} label="Fen Bilimleri" detail="Kavramları bağlantılarıyla öğren" tone="bg-[#dce9f4]" ink="text-[#2b5c82]" onClick={() => goTo("icerikler")} /><PopularCategory icon={Search} label="KPSS ve kurum sınavları" detail="Bağımsız sınav çalışma alanı" tone="bg-[#e7e4d2]" ink="text-[#6b6b37]" onClick={() => goTo("sinavlar")} /></div></div></section>

        <section id="icerikler" className="container py-20 sm:py-28">
          <div className="grid gap-7 lg:grid-cols-[.82fr_1.18fr] lg:items-end"><div><p className="editorial-kicker text-[#5c877e]">İçerik alanları</p><h2 className="mt-4 max-w-md text-4xl font-semibold leading-[.98] tracking-[-.058em] text-[#102e49] sm:text-6xl">Tek arayüz.<br /><span className="font-serif italic text-[#b77a29]">Altı farklı</span> çalışma biçimi.</h2></div><p className="max-w-xl border-l-2 border-[#e0b65f] pl-5 text-base leading-7 text-[#617783]">İhtiyacınız olan materyale ulaşmak için hangi kapıdan gireceğinizi bilmeniz yeterli. Her alan, aynı kategori düzeniyle çalışır.</p></div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[26px] border border-[#dfe1d9] bg-[#dfe1d9] sm:grid-cols-2 lg:grid-cols-3">{contentAreas.map(({ name, detail, icon: Icon, accent, ink }) => <button key={name} onClick={accountAction} className="group min-h-[220px] bg-[#fbfaf6] p-6 text-left transition duration-200 hover:bg-white"><div className="flex items-start justify-between"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${accent} ${ink}`}><Icon size={21} /></span><ArrowRight size={18} className="text-[#a3afb0] transition-transform group-hover:translate-x-1 group-hover:text-[#102e49]" /></div><h3 className="mt-14 text-2xl font-bold tracking-[-.045em] text-[#17354d]">{name}</h3><p className="mt-2 text-sm text-[#71828a]">{detail}</p></button>)}</div>
        </section>

        <section id="sinavlar" className="border-y border-[#dae0d8] bg-[#dcece6]"><div className="container grid gap-10 py-20 sm:py-24 lg:grid-cols-[1fr_.94fr] lg:items-center"><div><p className="editorial-kicker text-[#4a786d]">Kurum kategorisi</p><h2 className="mt-4 max-w-xl text-4xl font-semibold leading-[.99] tracking-[-.055em] text-[#12364f] sm:text-5xl">Sınav hazırlığı, okul akışından bağımsız hareket eder.</h2><p className="mt-6 max-w-lg leading-7 text-[#4d6d70]">KPSS ve kamu kurumu sınavları için alt kategori yapısı, aktif/pasif yönetim ve ilgili içeriklerinizi ayrı bir alanda düzenleyin.</p><Button onClick={accountAction} className="mt-8 rounded-full bg-[#12364f] px-6 font-bold text-white hover:bg-[#214c66]">Sınav alanına git <ArrowRight size={16} /></Button></div><div className="rounded-[28px] border border-white/80 bg-[#f7f5ed] p-6 shadow-[0_18px_35px_rgba(33,78,74,.1)] sm:p-8"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#153b58] text-[#f1c867]"><BookOpen size={21} /></span><span className="rounded-full bg-[#e2f0eb] px-3 py-1.5 text-[10px] font-bold text-[#2f6c5d]">BAĞIMSIZ YAPI</span></div><div className="mt-9 space-y-2">{["Kurum Kategorisi", "Alt Kategori", "İçerik ve Soru Havuzu"].map((item, index) => <div className="flex items-center gap-3" key={item}><span className="grid h-7 w-7 place-items-center rounded-full bg-[#dcece6] text-xs font-bold text-[#28685c]">{index + 1}</span><div className="flex flex-1 items-center justify-between rounded-xl border border-[#e2e4dd] bg-white px-4 py-3 text-sm font-bold text-[#29475b]"><span>{item}</span>{index < 2 && <ChevronRight size={15} className="text-[#82a69e]" />}</div></div>)}</div></div></div></section>

        <section id="yolculuk" className="container py-20 sm:py-28"><div className="rounded-[32px] bg-[#102e49] px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-14"><div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]"><div><p className="editorial-kicker text-[#a8cfc5]">Çalışma düzeni</p><h2 className="mt-4 text-4xl font-semibold leading-[.98] tracking-[-.055em] sm:text-5xl">Daha az karmaşa.<br /><span className="font-serif italic text-[#f2c866]">Daha çok odak.</span></h2><p className="mt-6 max-w-sm leading-7 text-[#c0d0d3]">OkulBlog, içerik üretiminden çalışmaya kadar her adımı izlenebilir bir eğitim yoluna bağlar.</p></div><div className="grid gap-3">{steps.map(([number, title, text]) => <div key={number} className="grid grid-cols-[42px_1fr_auto] gap-3 rounded-2xl border border-white/10 bg-white/[.055] p-5 sm:grid-cols-[55px_1fr_auto] sm:items-center"><span className="font-serif text-2xl italic text-[#f2c866]">{number}</span><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-[#b9c9cc]">{text}</p></div><ArrowRight size={17} className="text-[#83ada5]" /></div>)}</div></div></div></section>
      </main>

      <footer className="border-t border-[#dfe1d9] bg-[#efede5]"><div className="container flex flex-col gap-3 py-8 text-sm text-[#66777d] sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 font-bold text-[#244259]"><GraduationCap size={18} className="text-[#b77a29]" /> okulblog</div><p>İçerik, ölçme ve öğrenme için düzenli bir alan.</p><p>© {new Date().getFullYear()} OkulBlog</p></div></footer>
    </div>
  );
}

function PopularCategory({ icon: Icon, label, detail, tone, ink, onClick }: { icon: typeof FileText; label: string; detail: string; tone: string; ink: string; onClick: () => void }) {
  return <button onClick={onClick} className="group flex min-h-[132px] items-center gap-4 rounded-[22px] border border-[#e1e2da] bg-[#fbfaf6] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#b6c9c0] hover:bg-white hover:shadow-[0_14px_28px_rgba(16,46,73,.07)]"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone} ${ink}`}><Icon size={21} /></span><span className="min-w-0 flex-1"><span className="block text-lg font-bold tracking-[-.035em] text-[#17354d]">{label}</span><span className="mt-1 block text-sm leading-5 text-[#74848a]">{detail}</span></span><ArrowRight size={17} className="shrink-0 text-[#a3afb0] transition-transform group-hover:translate-x-1 group-hover:text-[#356f68]" /></button>;
}

function MiniTile({ icon: Icon, label, tone }: { icon: typeof FileText; label: string; tone: string }) {
  return <div className={`rounded-2xl p-3 ${tone}`}><Icon size={16} /><p className="mt-5 text-[11px] font-bold">{label}</p></div>;
}
