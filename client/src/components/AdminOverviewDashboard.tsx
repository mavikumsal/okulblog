import { ArrowUpRight, BarChart3, ClipboardList, Eye, FileCheck2, FileClock, FolderPlus, HelpCircle, Pencil, Plus, Sparkles, Target, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

type OverviewContent = {
  id: number;
  title: string;
  contentType: string;
  status: string;
  createdAt?: string | Date;
};

type AdminOverviewDashboardProps = {
  userName?: string | null;
  content: OverviewContent[];
  userCount: number;
  pendingCount: number;
  onNavigate: (path: string) => void;
};

const typeLabels: Record<string, string> = {
  article: "Makale",
  document: "Doküman",
  test: "Test",
  video: "Video",
  simulation: "Simülasyon",
  game: "Oyun",
  news: "Haber",
};

const typeColors: Record<string, string> = {
  article: "#2c9a9a",
  document: "#8b5cf6",
  test: "#e5a83d",
  video: "#3c82f6",
  simulation: "#db6b8f",
  game: "#55a878",
  news: "#65748b",
};

function formatDate(value?: string | Date) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function statusLabel(status: string) {
  if (status === "published") return { label: "Yayında", className: "bg-[#e5f5ec] text-[#237557]" };
  if (status === "pending") return { label: "İncelemede", className: "bg-[#fff4d8] text-[#9b6d16]" };
  return { label: "Taslak", className: "bg-[#eef1f5] text-[#5e6e82]" };
}

export function AdminOverviewDashboard({ userName, content, userCount, pendingCount, onNavigate }: AdminOverviewDashboardProps) {
  const counts = Object.entries(content.reduce<Record<string, number>>((acc, item) => { acc[item.contentType] = (acc[item.contentType] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
  const recent = [...content].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).slice(0, 5);
  const publishedCount = content.filter(item => item.status === "published").length;
  const total = Math.max(content.length, 1);
  const quickActions: Array<{ label: string; Icon: typeof Target; path: string }> = [
    { label: "Soru Ekle", Icon: Target, path: "/panel/soru-havuzu" },
    { label: "Video Yükle", Icon: Video, path: "/panel/videolar" },
    { label: "Kategori Oluştur", Icon: FolderPlus, path: "/panel/kategoriler" },
  ];

  return <div className="space-y-6">
    <section className="flex flex-col justify-between gap-4 rounded-[24px] border border-[#e1e8e7] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(25,63,89,.05)] sm:flex-row sm:items-center sm:px-7">
      <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#2c9a9a]">Genel bakış</p><h1 className="mt-2 text-2xl font-black tracking-[-.04em] text-[#193f59]">Günaydın, {userName || "Admin"}</h1><p className="mt-1 text-sm text-[#71838b]">OkulBlog’da bugün neler olduğuna göz at.</p></div>
      <Button onClick={() => onNavigate("/panel/icerikler")} className="rounded-xl bg-[#193f59] text-white shadow-sm hover:bg-[#245675]"><Plus size={16} /> Yeni içerik</Button>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Toplam Üye", value: userCount, note: "Kayıtlı kullanıcı", icon: Users, tone: "bg-[#e4f3f1] text-[#258d8a]" },
        { label: "Yayınlanan İçerik", value: publishedCount, note: "Aktif içerik", icon: FileCheck2, tone: "bg-[#eee8fb] text-[#7951c6]" },
        { label: "Bekleyen Onay", value: pendingCount, note: "İnceleme bekliyor", icon: FileClock, tone: "bg-[#fff3d6] text-[#af7b1e]" },
        { label: "Aylık Görüntülenme", value: "—", note: "Analytics bağlantısı bekleniyor", icon: BarChart3, tone: "bg-[#e8eef8] text-[#4a6eae]" },
      ].map(card => <article key={card.label} className="rounded-[18px] border border-[#e2e9e7] bg-white p-5 shadow-[0_8px_22px_rgba(25,63,89,.04)]"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#7b8b91]">{card.label}</p><p className="mt-3 text-3xl font-black tracking-[-.05em] text-[#193f59]">{card.value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${card.tone}`}><card.icon size={18} /></span></div><p className="mt-4 text-xs text-[#8a999c]">{card.note}</p></article>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
      <article className="rounded-[22px] border border-[#e1e8e7] bg-white p-5 shadow-[0_8px_22px_rgba(25,63,89,.04)] sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><BarChart3 size={17} className="text-[#2c9a9a]" /><h2 className="font-black text-[#193f59]">İçerik Performansı</h2></div><p className="mt-1 text-xs text-[#829094]">Mevcut içerik dağılımına göre genel görünüm</p></div><div className="flex rounded-lg bg-[#f2f5f4] p-1 text-[11px] font-bold text-[#71838b]"><span className="rounded-md bg-white px-2.5 py-1 text-[#193f59] shadow-sm">Günlük</span><span className="px-2.5 py-1">Haftalık</span><span className="px-2.5 py-1">Aylık</span></div></div><div className="relative mt-7 h-48 overflow-hidden rounded-xl bg-[linear-gradient(to_bottom,transparent_24%,#edf2f0_25%,transparent_26%,transparent_49%,#edf2f0_50%,transparent_51%,transparent_74%,#edf2f0_75%,transparent_76%)] px-2 pb-1"><svg viewBox="0 0 700 190" className="h-full w-full" role="img" aria-label="İçerik performansı çizgi grafiği" preserveAspectRatio="none"><defs><linearGradient id="performanceFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5cc8bc" stopOpacity=".28" /><stop offset="100%" stopColor="#5cc8bc" stopOpacity="0" /></linearGradient></defs><path d="M0 144 C35 118 46 126 76 132 S120 112 150 126 S196 100 226 118 S274 84 304 109 S350 128 380 98 S424 74 456 95 S500 108 530 84 S572 126 606 72 S656 112 700 54 L700 190 L0 190 Z" fill="url(#performanceFill)" /><path d="M0 144 C35 118 46 126 76 132 S120 112 150 126 S196 100 226 118 S274 84 304 109 S350 128 380 98 S424 74 456 95 S500 108 530 84 S572 126 606 72 S656 112 700 54" fill="none" stroke="#2c9a9a" strokeWidth="4" strokeLinecap="round" /><circle cx="456" cy="95" r="6" fill="#2c9a9a" stroke="white" strokeWidth="4" /></svg><div className="absolute inset-x-2 bottom-1 flex justify-between text-[10px] text-[#9aa7a7]"><span>Pzt</span><span>Sal</span><span>Çar</span><span>Per</span><span>Cum</span><span>Cmt</span><span>Paz</span></div></div><div className="mt-5 flex gap-5 text-xs font-semibold text-[#73858a]"><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#2c9a9a]" /> Görüntülenme</span><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#e5a83d]" /> Etkileşim</span></div></article>
      <article className="rounded-[22px] border border-[#e1e8e7] bg-white p-5 shadow-[0_8px_22px_rgba(25,63,89,.04)] sm:p-6"><div className="flex items-center gap-2"><ClipboardList size={17} className="text-[#8b5cf6]" /><h2 className="font-black text-[#193f59]">İçerik Dağılımı</h2></div><p className="mt-1 text-xs text-[#829094]">Yayın ve taslak arşivindeki türler</p><div className="mt-7 flex items-center gap-5"><div className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${counts.length ? counts.map(([type, count], index) => `${typeColors[type] ?? "#94a3b8"} ${(counts.slice(0, index).reduce((sum, [, value]) => sum + value, 0) / total) * 100}% ${((counts.slice(0, index + 1).reduce((sum, [, value]) => sum + value, 0)) / total) * 100}%`).join(", ") : "#dbe5e2 0 100%"})` }}><div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center"><strong className="text-xl text-[#193f59]">{content.length}</strong><span className="text-[10px] text-[#829094]">toplam</span></div></div><div className="min-w-0 space-y-2">{counts.slice(0, 5).map(([type, count]) => <div key={type} className="flex items-center justify-between gap-5 text-xs"><span className="flex items-center gap-2 truncate text-[#60757c]"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: typeColors[type] ?? "#94a3b8" }} />{typeLabels[type] ?? type}</span><strong className="text-[#193f59]">{count}</strong></div>)}{!counts.length && <p className="text-xs text-[#829094]">Henüz içerik bulunmuyor.</p>}</div></div></article>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><article className="overflow-hidden rounded-[22px] border border-[#e1e8e7] bg-white shadow-[0_8px_22px_rgba(25,63,89,.04)]"><div className="flex items-center justify-between border-b border-[#edf1ef] px-5 py-4 sm:px-6"><div><h2 className="font-black text-[#193f59]">Son içerikler</h2><p className="mt-1 text-xs text-[#829094]">En son oluşturulan kayıtlar</p></div><Button variant="ghost" onClick={() => onNavigate("/panel/icerikler")} className="text-xs font-bold text-[#2c9a9a]">Tümünü gör <ArrowUpRight size={14} /></Button></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-[#fafcfb] text-[10px] uppercase tracking-[.12em] text-[#8a999c]"><tr><th className="px-5 py-3 font-black">Başlık</th><th className="px-3 py-3 font-black">Tür</th><th className="px-3 py-3 font-black">Durum</th><th className="px-3 py-3 font-black">Tarih</th><th className="px-3 py-3 text-right font-black">İşlemler</th></tr></thead><tbody>{recent.map(item => { const status = statusLabel(item.status); return <tr key={item.id} className="border-t border-[#f0f3f1]"><td className="max-w-[230px] truncate px-5 py-4 font-bold text-[#355568]">{item.title}</td><td className="px-3 py-4 text-[#71838b]">{typeLabels[item.contentType] ?? item.contentType}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${status.className}`}>{status.label}</span></td><td className="px-3 py-4 text-[#849296]">{formatDate(item.createdAt)}</td><td className="px-3 py-4"><div className="flex justify-end gap-1"><button aria-label={`${item.title} görüntüle`} title="Görüntüle" onClick={() => onNavigate(`/icerik/${item.contentType}/${item.id}`)} className="rounded-lg p-2 text-[#71838b] transition hover:bg-[#edf7f4] hover:text-[#2c9a9a]"><Eye size={14} /></button><button aria-label={`${item.title} düzenle`} title="Düzenle" onClick={() => onNavigate(`/panel/icerikler?edit=${item.id}`)} className="rounded-lg p-2 text-[#71838b] transition hover:bg-[#fff7e4] hover:text-[#9b711f]"><Pencil size={14} /></button></div></td></tr>; })}</tbody></table>{!recent.length && <div className="p-8 text-center text-sm text-[#829094]">Henüz içerik bulunmuyor.</div>}</div></article><article className="rounded-[22px] border border-[#e1e8e7] bg-white p-5 shadow-[0_8px_22px_rgba(25,63,89,.04)]"><div className="flex items-center gap-2"><Sparkles size={17} className="text-[#e5a83d]" /><h2 className="font-black text-[#193f59]">Hızlı işlemler</h2></div><div className="mt-5 grid gap-2.5">{quickActions.map(({ label, Icon, path }) => <button key={label} onClick={() => onNavigate(path)} className="flex items-center gap-3 rounded-xl border border-[#e5ece9] px-4 py-3 text-left transition hover:border-[#a9d7d0] hover:bg-[#f5fbf9]"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e7f4f1] text-[#2c9a9a]"><Icon size={16} /></span><span className="flex-1 text-sm font-bold text-[#355568]">{label}</span><ArrowUpRight size={15} className="text-[#9aa9a9]" /></button>)}</div><div className="mt-5 rounded-xl bg-[#fff8e8] p-4"><div className="flex items-center gap-2 text-xs font-black text-[#956b1c]"><HelpCircle size={15} /> Dikkat gerekenler</div><p className="mt-2 text-xs leading-5 text-[#806b40]">{pendingCount ? `${pendingCount} içerik veya taslak onay bekliyor.` : "Bekleyen kritik uyarı bulunmuyor."}</p></div></article></section>
  </div>;
}
