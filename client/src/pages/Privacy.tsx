import { ArrowLeft, CheckCircle2, GraduationCap, LockKeyhole, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

const sections = [
  ["Topladığımız bilgiler", "OkulBlog’da hesap oluşturduğunuzda veya platformu kullandığınızda, hizmeti sunmak için gerekli hesap, içerik etkileşimi ve tercih bilgileri işlenebilir. Gereksiz kişisel verileri istememeye özen gösteririz."],
  ["Bilgileri nasıl kullanırız?", "Bilgiler; hesabınızı yönetmek, içerikleri kişiselleştirmek, ilerleme durumunu göstermek, güvenliği korumak ve platform deneyimini geliştirmek amacıyla kullanılır. Veriler reklam amacıyla izinsiz şekilde satılmaz."],
  ["İçerik ve görünürlük", "Platformda paylaştığınız soru, cevap veya içeriklerin hangi bölümlerde görüneceği ilgili sayfadaki paylaşım kurallarına göre belirlenir. Kişisel iletişim bilgileriniz yayınlanan içeriğin parçası değildir."],
  ["Güvenlik ve saklama", "Hesap ve içerik verilerini yetkisiz erişime karşı korumak için teknik ve idari önlemler uygularız. Veriler, hizmetin sunulması için gerekli olduğu sürece veya yasal yükümlülükler devam ettiği müddetçe saklanabilir."],
  ["Haklarınız", "Kişisel verilerinizle ilgili bilgi istemek, düzeltme talep etmek veya hesabınızın kapatılmasını istemek için OkulBlog destek kanallarından bize ulaşabilirsiniz. Talebinizi inceler ve yürürlükteki kurallara göre yanıtlarız."],
];

export default function Privacy() {
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

      <section className="bg-[#e9f8f7] px-4 py-14 sm:py-20"><div className="container max-w-4xl"><div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#0f9f9a] shadow-sm"><ShieldCheck size={27} /></span><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#0f817d]">OkulBlog</p><h1 className="mt-1 text-4xl font-black tracking-[-.06em] sm:text-5xl">Gizlilik Politikası</h1></div></div><p className="mt-6 max-w-2xl text-base leading-8 text-[#315469]">Gizliliğiniz bizim için önemlidir. Bu sayfa, OkulBlog’u kullanırken bilgilerinizin hangi amaçlarla işlendiğini ve haklarınızı açıklar.</p><p className="mt-4 text-sm font-semibold text-[#5b7180]">Son güncelleme: 19 Ağustos 2026</p></div></section>

      <section className="container grid max-w-4xl gap-4 px-4 py-12 sm:py-16">{sections.map(([title, description]) => <article key={title} className="rounded-[22px] border border-[#dce8ed] bg-white p-6 shadow-[0_12px_30px_rgba(16,44,67,.05)] sm:p-7"><div className="flex items-start gap-4"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f5edda] text-[#a67516]"><CheckCircle2 size={18} /></span><div><h2 className="text-lg font-black">{title}</h2><p className="mt-3 text-sm leading-7 text-[#5b7180]">{description}</p></div></div></article>)}</section>

      <section className="container max-w-4xl px-4 pb-20"><div className="flex items-start gap-4 rounded-[22px] border border-[#b8ddd4] bg-[#e9f8f7] p-6 text-[#155d55]"><LockKeyhole size={20} className="mt-1 shrink-0" /><p className="text-sm leading-7">Bu metin, OkulBlog’un genel veri işleme yaklaşımını açıklar. Hizmet kapsamı veya yasal gereklilikler değiştiğinde politika metni güncellenebilir; önemli değişiklikleri platform üzerinden duyururuz.</p></div></section>
    </main>
  );
}
