import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  FileText,
  Gamepad2,
  GraduationCap,
  Layers3,
  Menu,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Video,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const sections = [
  { name: "Testler", description: "Kazanım odaklı ölçme deneyimi", icon: Target, tone: "bg-[#d7f0e9] text-[#165e56]", count: "1.240+ test" },
  { name: "Dokümanlar", description: "Düzenli ve erişilebilir kaynaklar", icon: FileText, tone: "bg-[#f6e5bc] text-[#80591a]", count: "980+ içerik" },
  { name: "Simülasyonlar", description: "Etkileşimle kavrayın", icon: Layers3, tone: "bg-[#e8e2f8] text-[#56428a]", count: "62 deneyim" },
  { name: "Videolar", description: "Kısa, odaklı konu anlatımları", icon: Video, tone: "bg-[#f8ddd9] text-[#99473c]", count: "340+ video" },
  { name: "Oyunlar", description: "Öğrenmeyi canlı tutan pratik", icon: Gamepad2, tone: "bg-[#dcebf7] text-[#285d81]", count: "48 oyun" },
  { name: "Haberler", description: "Eğitim gündeminden seçkiler", icon: BookOpen, tone: "bg-[#e5edcf] text-[#506b29]", count: "Güncel akış" },
];

const workflow = [
  { number: "01", title: "Hedefi seç", text: "Sınıf, ders, ünite veya kazanımı belirleyin." },
  { number: "02", title: "İçeriği keşfet", text: "Test, doküman ve simülasyonları tek düzende bulun." },
  { number: "03", title: "İlerlemeni izle", text: "Öğrenme yolculuğunuz görünür ve anlamlı kalsın." },
];

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const goTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const openPanel = () => setLocation("/panel");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fbfaf4] text-[#18344f]">
      <header className="sticky top-0 z-50 border-b border-[#e8e4d8] bg-[#fbfaf4]/90 backdrop-blur-xl">
        <div className="container flex h-[76px] items-center justify-between gap-6">
          <button onClick={() => goTo("baslangic")} className="group flex items-center gap-3 text-left" aria-label="OkulBlog ana sayfa">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#18344f] text-[#f5d37c] shadow-[0_10px_22px_rgba(24,52,79,.2)] transition-transform duration-200 group-hover:-translate-y-0.5"><GraduationCap size={22} /></span>
            <span className="text-xl font-bold tracking-[-0.04em]">okul<span className="font-serif italic font-semibold text-[#8f7027]">blog</span></span>
          </button>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#526879] md:flex">
            <button onClick={() => goTo("kesfet")} className="transition-colors hover:text-[#18344f]">Keşfet</button>
            <button onClick={() => goTo("yaklasim")} className="transition-colors hover:text-[#18344f]">Nasıl çalışır?</button>
            <button onClick={() => goTo("sinavlar")} className="transition-colors hover:text-[#18344f]">Sınavlar</button>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? <Button onClick={openPanel} variant="ghost" className="font-semibold">{user?.name ?? "Panelim"}</Button> : <Button onClick={startLogin} variant="ghost" className="font-semibold">Giriş yap</Button>}
            <Button onClick={isAuthenticated ? openPanel : startLogin} className="rounded-xl bg-[#18344f] px-5 font-semibold text-white shadow-[0_10px_20px_rgba(24,52,79,.17)] transition-transform duration-200 hover:bg-[#234864] active:scale-[.97]">
              {isAuthenticated ? "Panele git" : "Hemen başla"}<ArrowRight size={16} />
            </Button>
          </div>
          <button onClick={() => setMenuOpen(v => !v)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e8e4d8] bg-white md:hidden" aria-label="Menüyü aç">{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
        {menuOpen && <div className="border-t border-[#e8e4d8] bg-[#fbfaf4] px-4 py-4 md:hidden"><div className="grid gap-2"><button onClick={() => goTo("kesfet")} className="rounded-xl px-4 py-3 text-left font-semibold hover:bg-white">Keşfet</button><button onClick={() => goTo("yaklasim")} className="rounded-xl px-4 py-3 text-left font-semibold hover:bg-white">Nasıl çalışır?</button><Button onClick={isAuthenticated ? openPanel : startLogin} className="mt-1 bg-[#18344f]">{loading ? "Yükleniyor..." : isAuthenticated ? "Panele git" : "Giriş yap"}</Button></div></div>}
      </header>

      <main>
        <section id="baslangic" className="relative isolate overflow-hidden border-b border-[#e8e4d8]">
          <div className="pointer-events-none absolute inset-0 -z-10 grid-wash opacity-45" />
          <div className="pointer-events-none absolute -right-16 top-10 -z-10 h-80 w-80 rounded-full bg-[#d8efe7] blur-3xl" />
          <div className="pointer-events-none absolute left-[40%] top-4 -z-10 h-40 w-40 rounded-full bg-[#f6e2ad] blur-3xl" />
          <div className="container grid min-h-[630px] items-center gap-12 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-20">
            <div className="max-w-2xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d7e5df] bg-white/80 px-3.5 py-2 text-xs font-bold tracking-wide text-[#376c63]"><Sparkles size={14} className="text-[#ae8024]" /> Öğrenme için daha sakin bir düzen</div>
              <h1 className="max-w-xl text-5xl font-semibold leading-[.98] tracking-[-0.065em] text-[#18344f] sm:text-6xl lg:text-7xl">Her hedef için <span className="font-serif italic font-semibold text-[#8b6b23]">doğru</span> öğrenme alanı.</h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-[#5b7080] sm:text-lg">OkulBlog, eğitim içeriklerini, ölçme araçlarını ve sınav hazırlığını tek bir yalın yolculukta birleştirir.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button onClick={() => goTo("kesfet")} size="lg" className="h-13 rounded-xl bg-[#18344f] px-6 font-semibold text-white hover:bg-[#234864]">İçerikleri keşfet <ArrowRight size={17} /></Button><Button onClick={() => goTo("yaklasim")} size="lg" variant="outline" className="h-13 rounded-xl border-[#d9d8ce] bg-white/70 px-6 font-semibold text-[#28475e] hover:bg-white"><PlayCircle size={18} className="text-[#6d978d]" /> Nasıl çalışır?</Button></div>
              <div className="mt-12 flex flex-wrap gap-x-7 gap-y-4 text-sm text-[#5c7180]"><span className="flex items-center gap-2"><BadgeCheck size={17} className="text-[#4b897c]" /> Kazanım odaklı</span><span className="flex items-center gap-2"><ShieldCheck size={17} className="text-[#4b897c]" /> Güvenli alan</span><span className="flex items-center gap-2"><BrainCircuit size={17} className="text-[#4b897c]" /> Yapay zekâ destekli</span></div>
            </div>
            <div className="relative mx-auto w-full max-w-[490px] pb-6 pt-4 lg:pt-0">
              <div className="absolute inset-x-8 top-0 h-24 rounded-[30px] bg-[#e9c86f]/35 blur-2xl" />
              <div className="relative rounded-[30px] border border-white/75 bg-white/75 p-4 shadow-[0_24px_80px_rgba(23,51,76,.14)] backdrop-blur-sm sm:p-6">
                <div className="flex items-center justify-between border-b border-[#edf0eb] pb-5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d7f0e9] text-[#176257]"><Target size={20} /></div><div><p className="text-sm font-bold">Bugünün rotası</p><p className="text-xs text-[#718391]">Kazanıma göre ilerle</p></div></div><span className="rounded-full bg-[#fff4d9] px-3 py-1 text-xs font-bold text-[#95702a]">%74 tamamlandı</span></div>
                <div className="mt-5 rounded-2xl bg-[#18344f] p-5 text-white"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold tracking-[.13em] text-[#a9c6ca] uppercase">Türkçe · 1. Sınıf</p><h2 className="mt-2 text-xl font-semibold">Okuduğunu anlama</h2></div><BookOpen size={22} className="text-[#f5d37c]" /></div><div className="mt-7 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[74%] rounded-full bg-[#f5d37c]" /></div><div className="mt-3 flex justify-between text-xs text-[#c8d5d8]"><span>8 içerik işlendi</span><span>2 içerik kaldı</span></div></div>
                <div className="mt-4 grid grid-cols-3 gap-3"><div className="rounded-2xl bg-[#f0f6f2] p-3"><FileText size={17} className="text-[#4b897c]" /><p className="mt-4 text-xs font-bold">Doküman</p><p className="mt-1 text-[11px] text-[#74858a]">4 yeni kaynak</p></div><div className="rounded-2xl bg-[#fcf5e5] p-3"><Target size={17} className="text-[#b57b28]" /><p className="mt-4 text-xs font-bold">Test</p><p className="mt-1 text-[11px] text-[#74858a]">12 soru</p></div><div className="rounded-2xl bg-[#f1eef9] p-3"><Layers3 size={17} className="text-[#6f5c9c]" /><p className="mt-4 text-xs font-bold">Simülasyon</p><p className="mt-1 text-[11px] text-[#74858a]">1 deneyim</p></div></div>
              </div>
              <div className="absolute -bottom-1 -left-8 hidden rounded-2xl border border-white bg-white px-4 py-3 shadow-xl sm:flex sm:items-center sm:gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f8e1da] text-[#a35346]"><Sparkles size={16} /></div><div><p className="text-xs font-bold">Akıllı öneri</p><p className="text-[11px] text-[#74858a]">Sana uygun yeni içerikler</p></div></div>
            </div>
          </div>
        </section>

        <section id="kesfet" className="container py-20 sm:py-24">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="editorial-kicker">Keşif alanı</p><h2 className="mt-3 max-w-xl text-4xl font-semibold tracking-[-.05em] text-[#18344f] sm:text-5xl">İçerik tek yerde, odağın sende.</h2></div><p className="max-w-sm text-sm leading-6 text-[#627887]">Öğrenme ihtiyacına göre tasarlanmış altı içerik alanı; erişilebilir, düzenli ve birbiriyle bağlantılı.</p></div>
          <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{sections.map(({ name, description, icon: Icon, tone, count }) => <button key={name} onClick={() => toast.info(`${name} alanı içerik yönetimi modülüyle birlikte hazırlanıyor.`)} className="group rounded-[23px] border border-[#ebe7dc] bg-white p-6 text-left shadow-[0_8px_22px_rgba(34,59,73,.035)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(34,59,73,.1)]"><div className="flex items-start justify-between"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}><Icon size={22} /></span><ChevronRight size={19} className="text-[#b7c2c4] transition-transform group-hover:translate-x-1 group-hover:text-[#18344f]" /></div><h3 className="mt-12 text-xl font-bold tracking-[-.03em] text-[#203c54]">{name}</h3><p className="mt-2 text-sm leading-6 text-[#6d808b]">{description}</p><p className="mt-5 text-xs font-bold text-[#839196]">{count}</p></button>)}</div>
        </section>

        <section id="yaklasim" className="border-y border-[#e7e2d7] bg-[#eef5f0] py-20 sm:py-24"><div className="container grid gap-12 lg:grid-cols-[.85fr_1.15fr]"><div><p className="editorial-kicker text-[#548074]">Net bir yaklaşım</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.05em] text-[#18344f] sm:text-5xl">Öğrenme yolunu karmaşadan çıkarır.</h2><p className="mt-6 max-w-md leading-7 text-[#5e757a]">Her içerik, sabit kategori hiyerarşisiyle ilişkilendirilir. Böylece doğru materyale doğru anda ulaşırsınız.</p></div><div className="grid gap-3">{workflow.map(item => <div key={item.number} className="group grid grid-cols-[55px_1fr_auto] items-center gap-4 rounded-2xl border border-white/80 bg-white/70 px-5 py-5 transition hover:bg-white"><span className="font-serif text-2xl italic text-[#b58c3a]">{item.number}</span><div><h3 className="font-bold text-[#23435a]">{item.title}</h3><p className="mt-1 text-sm text-[#6f8286]">{item.text}</p></div><ArrowRight size={18} className="text-[#a5b6b1] transition-transform group-hover:translate-x-1" /></div>)}</div></div></section>

        <section id="sinavlar" className="container py-20 sm:py-24"><div className="overflow-hidden rounded-[30px] bg-[#18344f] px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-14"><div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center"><div><p className="editorial-kicker text-[#a5cac0]">Kurum kategorisi</p><h2 className="mt-3 max-w-xl text-4xl font-semibold tracking-[-.055em] sm:text-5xl">Sınav hazırlığı da kendine ait bir düzende.</h2><p className="mt-6 max-w-lg leading-7 text-[#c5d1d2]">KPSS ve kamu kurumu sınavlarında, eğitim hiyerarşisinden bağımsız; aktif/pasif yönetilebilen kapsamlı kategori altyapısı.</p><Button onClick={() => toast.info("Kurum Kategorisi yönetimi Admin panelinde açılacak.")} className="mt-8 rounded-xl bg-[#f5d37c] px-5 font-bold text-[#203b51] hover:bg-[#f8dea0]">Sınav alanını incele <ArrowRight size={16} /></Button></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/9 p-5"><p className="text-3xl font-semibold text-[#f5d37c]">02</p><p className="mt-5 text-sm font-bold">Ayrı kategori mantığı</p><p className="mt-1 text-xs leading-5 text-[#b8c9cb]">Eğitim ve kurum yapıları birbirinden ayrıdır.</p></div><div className="rounded-2xl bg-white/9 p-5"><p className="text-3xl font-semibold text-[#f5d37c]">06</p><p className="mt-5 text-sm font-bold">Bağlanan içerik alanı</p><p className="mt-1 text-xs leading-5 text-[#b8c9cb]">Testten oyuna aynı düzenle bağlanır.</p></div><div className="col-span-2 rounded-2xl border border-white/12 bg-[#234761] p-5"><p className="text-xs font-bold tracking-[.16em] text-[#a5cac0] uppercase">Yönetilebilir erişim</p><p className="mt-3 text-sm leading-6 text-[#d2dddd]">Admin, Öğretmen ve Moderatör panellerinde hangi alanların görünür olacağını bölüm bazında belirler.</p></div></div></div></div></section>
      </main>
      <footer className="border-t border-[#e8e4d8] bg-[#f6f3ea]"><div className="container flex flex-col gap-4 py-8 text-sm text-[#667b87] sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 font-semibold text-[#23435a]"><GraduationCap size={18} className="text-[#92712a]" /> okulblog</div><p>Öğrenme için daha sakin, daha düzenli bir alan.</p><p>© {new Date().getFullYear()} OkulBlog</p></div></footer>
    </div>
  );
}
