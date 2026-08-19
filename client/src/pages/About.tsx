import { ArrowLeft, BookOpen, CheckCircle2, GraduationCap, Heart, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export default function About() {
  const [, setLocation] = useLocation();

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#102c43]">
      <header className="bg-[#061b2e] text-white">
        <div className="container flex h-20 items-center justify-between gap-4">
          <button onClick={() => setLocation("/")} className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2c866]" aria-label="OkulBlog ana sayfaya dön">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f9f9a] shadow-[0_9px_20px_rgba(15,159,154,.28)]"><GraduationCap size={21} /></span>
            <span className="text-[21px] font-bold tracking-[-.06em]">okul<span className="font-serif text-[#f2c866]">blog</span></span>
          </button>
          <button onClick={() => setLocation("/")} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80 transition hover:border-[#b8ddd4] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2c866]"><ArrowLeft size={16} /> Ana sayfa</button>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#e9f8f7] px-4 py-16 sm:py-24">
        <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#f2c866]/20 blur-3xl" />
        <div className="container relative max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-[#0f817d]"><Sparkles size={14} /> OkulBlog’u tanıyın</span>
          <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-[-.06em] text-[#102c43] sm:text-6xl">Öğrenmeyi herkes için daha düzenli ve ulaşılabilir kılmak.</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#315469] sm:text-lg">OkulBlog; öğrencilerin, öğretmenlerin ve eğitim içerikleri üreten ekiplerin güvenilir kaynaklara tek bir öğrenme alanı üzerinden ulaşabilmesi için tasarlanmış bir eğitim platformudur.</p>
        </div>
      </section>

      <section className="container grid gap-6 px-4 py-12 sm:grid-cols-3 sm:py-16">
        {[
          [BookOpen, "Düzenli içerik", "Test, doküman, video, simülasyon ve oyunları anlaşılır bir kategori yapısında bir araya getiriyoruz."],
          [Heart, "Öğrenci odaklı", "İçerikleri daha kolay keşfetmek, takip etmek ve kişisel öğrenme ritmini korumak için sade deneyimler sunuyoruz."],
          [CheckCircle2, "Güvenilir alan", "Yayınlanan içeriklerin düzenli, erişilebilir ve amacına uygun olmasına önem veriyoruz."],
        ].map(([Icon, title, description]) => {
          const FeatureIcon = Icon as typeof BookOpen;
          return <article key={title as string} className="rounded-[22px] border border-[#dce8ed] bg-white p-6 shadow-[0_12px_30px_rgba(16,44,67,.06)]"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e9f8f7] text-[#0f9f9a]"><FeatureIcon size={20} /></span><h2 className="mt-5 text-lg font-black">{title as string}</h2><p className="mt-3 text-sm leading-7 text-[#5b7180]">{description as string}</p></article>;
        })}
      </section>

      <section className="container max-w-4xl px-4 pb-20">
        <div className="rounded-[28px] bg-[#061b2e] p-7 text-white sm:p-10"><h2 className="text-2xl font-black tracking-[-.04em]">Nasıl çalışıyoruz?</h2><p className="mt-4 max-w-2xl leading-8 text-[#b7c7d0]">OkulBlog’un kategori ağacı; eğitim seviyesi, sınıf, ders, ünite ve kazanım bağlamını korur. Böylece öğrenci aradığı içeriğe daha kısa yoldan ulaşırken öğretmenler de öğrenme hedefleriyle ilişkili kaynaklar oluşturabilir.</p><button onClick={() => setLocation("/icerik/all")} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#f2c866] px-5 py-3 text-sm font-black text-[#061b2e] transition hover:bg-[#ffd979] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">İçerikleri keşfet</button></div>
      </section>
    </main>
  );
}
