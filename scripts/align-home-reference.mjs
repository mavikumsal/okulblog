import fs from "node:fs";

const path = "client/src/pages/Home.tsx";
let source = fs.readFileSync(path, "utf8");

source = source.replace(
  '<section id="baslangic" className="relative overflow-hidden bg-[#102e49] text-white">',
  '<section id="baslangic" className="relative overflow-hidden bg-gradient-to-br from-[#1f5fe8] via-[#3f35c4] to-[#6322a0] text-white">',
);
source = source.replace(
  'className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[#f8f5ed] p-4 text-[#15344e] shadow-[0_28px_80px_rgba(0,0,0,.23)] sm:p-5"',
  'className="relative overflow-hidden rounded-[32px] border border-white/25 bg-white/95 p-4 text-[#15344e] shadow-[0_28px_80px_rgba(31,41,55,.24)] sm:p-5"',
);
source = source.replace(
  'bg-[#153b58] p-5 text-white',
  'bg-[#172c74] p-5 text-white',
);
source = source.replace(
  'bg-[#e8b85d] px-4 py-3 text-[#2b4050]',
  'bg-[#ffd21a] px-4 py-3 text-[#111827]',
);
const marker = '        <section className="border-b border-[#eef0f5] bg-white"><div className="container grid gap-5 py-6';
const stats = `        <section aria-label="Platform istatistikleri" className="relative z-10 -mt-8 bg-transparent"><div className="container grid gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-[22px] bg-white px-5 py-5 text-center shadow-[0_14px_28px_rgba(31,41,55,.12)] ring-1 ring-[#eef0f5]"><strong className="block text-3xl font-black tracking-[-.04em] text-[#2864d8]">{overview.data?.content?.filter(item => item.contentType === "test").length ?? 0}</strong><span className="mt-1 block text-xs font-bold text-[#6b7280]">Aktif Test</span></div><div className="rounded-[22px] bg-white px-5 py-5 text-center shadow-[0_14px_28px_rgba(31,41,55,.12)] ring-1 ring-[#eef0f5]"><strong className="block text-3xl font-black tracking-[-.04em] text-[#5540e8]">{overview.data?.content?.filter(item => item.contentType === "document").length ?? 0}</strong><span className="mt-1 block text-xs font-bold text-[#6b7280]">Doküman</span></div><div className="rounded-[22px] bg-white px-5 py-5 text-center shadow-[0_14px_28px_rgba(31,41,55,.12)] ring-1 ring-[#eef0f5]"><strong className="block text-3xl font-black tracking-[-.04em] text-[#8b35d8]">{overview.data?.content?.filter(item => item.contentType === "video").length ?? 0}</strong><span className="mt-1 block text-xs font-bold text-[#6b7280]">Video Ders</span></div><div className="rounded-[22px] bg-white px-5 py-5 text-center shadow-[0_14px_28px_rgba(31,41,55,.12)] ring-1 ring-[#eef0f5]"><strong className="block text-3xl font-black tracking-[-.04em] text-[#d62676]">{overview.data?.educationCategories?.length ?? 0}</strong><span className="mt-1 block text-xs font-bold text-[#6b7280]">Eğitim Kategorisi</span></div></div></section>\n\n${marker}`;
source = source.replace(marker, stats);
fs.writeFileSync(path, source);
