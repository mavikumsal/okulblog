import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, FileText, Gamepad2, Layers3, PlayCircle, Sparkles, Target, Video } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { classCoverUrl } from "./Home";
import { classGroupForName } from "./ContentHub";

const typeMeta = [
  { key: "video", label: "Video", icon: Video, tone: "text-[#b3473a] bg-[#fff0ed]" },
  { key: "test", label: "Test", icon: Target, tone: "text-[#8b5a14] bg-[#fff7dc]" },
  { key: "document", label: "Doküman", icon: FileText, tone: "text-[#216b62] bg-[#eaf8f3]" },
  { key: "game", label: "Oyun", icon: Gamepad2, tone: "text-[#315c8e] bg-[#edf5ff]" },
  { key: "simulation", label: "Simülasyon", icon: Layers3, tone: "text-[#684a88] bg-[#f3edff]" },
];

function classLabel(groupKey: string) {
  return groupKey === "elementary" ? "İlkokul 1–4" : groupKey === "middle" ? "Ortaokul 5–8" : "Lise 9–12";
}

export default function LatestPreview() {
  const overview = trpc.platform.overview.useQuery();
  const [activeCard, setActiveCard] = useState<string | null>("elementary");
  const content = overview.data?.content ?? [];
  const classes = [
    { key: "elementary", grade: "1. Sınıf" },
    { key: "middle", grade: "5. Sınıf" },
    { key: "high", grade: "9. Sınıf" },
  ];
  const counts = (key: string) => typeMeta.map(type => ({ ...type, count: content.filter(item => item.contentType === type.key).length }));
  const activeGroup = classGroupForName(classes.find(item => item.key === activeCard)?.grade ?? "1. Sınıf");

  return (
    <main className="min-h-screen bg-[#fafaff] text-[#111827]">
      <header className="border-b border-[#e8e8f0] bg-white/95 px-4 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-[-.05em] text-[#5540e8]">okul<span className="font-serif text-[#7c3aed]">blog</span></Link>
          <Link href="/" className="rounded-full border border-[#dedcf3] px-4 py-2 text-sm font-bold text-[#5540e8] transition hover:bg-[#f3f0ff]">Ana sayfaya dön</Link>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-8 sm:pt-16">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.18em] text-[#5540e8]"><Sparkles size={15} /> Son güncelleme önizlemesi</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-.06em] sm:text-6xl">Sınıf kartlarının yeni hali</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#697184]">Özel kapak illüstrasyonlarını, içerik türü ikonlarını ve “Tümünü Gör” aksiyonunu etkileşimli olarak deneyin.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 sm:grid-cols-3 sm:px-8" aria-label="Sınıf kartı önizlemeleri">
        {classes.map(item => {
          const group = classGroupForName(item.grade);
          const isActive = activeCard === item.key;
          return (
            <article key={item.key} onMouseEnter={() => setActiveCard(item.key)} onFocus={() => setActiveCard(item.key)} className={`group relative overflow-visible rounded-[28px] border bg-white p-3 shadow-[0_12px_35px_rgba(31,41,55,.08)] transition duration-200 ${isActive ? "-translate-y-1 border-[#aaa0f4] shadow-[0_20px_45px_rgba(85,64,232,.18)]" : "border-[#e8e9ef]"}`}>
              <div className="relative h-48 overflow-hidden rounded-[22px]">
                <img src={classCoverUrl(item.key)} alt={`${classLabel(item.key)} sınıf grubu illüstrasyonu`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white"><p className="text-xs font-extrabold uppercase tracking-[.16em]">{classLabel(item.key)}</p><h2 className="mt-1 text-2xl font-black">{item.grade}</h2></div>
              </div>
              <div className="px-2 pb-2 pt-4"><p className="text-sm text-[#697184]">{group ? "MEB eğitim yolculuğu" : "Eğitim içerikleri"}</p><div className="mt-4 flex flex-wrap gap-2">{counts(item.key).map(type => { const Icon = type.icon; return <span key={type.key} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold ${type.tone}`}><Icon size={13} aria-hidden="true" />{type.count} {type.label}</span>; })}</div></div>
              {isActive && <div className="relative z-20 mt-4 rounded-[22px] sm:absolute sm:left-3 sm:right-3 sm:top-[calc(100%-1rem)] sm:mt-0 border border-[#dcd8ff] bg-white p-4 shadow-[0_22px_55px_rgba(45,35,130,.2)]" role="region" aria-label={`${item.grade} önizleme detayları`}><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#5540e8]">Önizleme</p><p className="mt-1 text-sm font-bold text-[#1f2937]">Popüler dersler ve yeni içerikler</p></div><BookOpen size={19} className="text-[#5540e8]" /></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-[#5d6677]"><span className="rounded-xl bg-[#f5f4ff] px-3 py-2">Türkçe</span><span className="rounded-xl bg-[#f5f4ff] px-3 py-2">Matematik</span></div><Link href={`/icerik/test?class=${encodeURIComponent(item.grade)}&contentType=all`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5540e8] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#4632cf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5540e8]/40">Tümünü Gör <ArrowRight size={16} /></Link></div>}
            </article>
          );
        })}
      </section>
      <footer className="border-t border-[#e8e8f0] bg-white px-4 py-6 text-center text-sm text-[#697184]">OkulBlog sınıf kartı güncelleme önizlemesi</footer>
    </main>
  );
}
