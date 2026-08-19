import fs from "node:fs";

const path = "client/src/pages/Home.tsx";
const source = fs.readFileSync(path, "utf8");
const before = source;

const redundantStart = '        <section className="border-b border-[#eef0f5] bg-white"><div className="container grid gap-5 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center"><p className="text-sm font-bold text-[#24435b]">Nereden başlamak istersiniz?</p>';
const redundantEnd = '</div></section>\n\n        <section id="egitim-seviyeleri"';
const startIndex = source.indexOf(redundantStart);
const endIndex = source.indexOf(redundantEnd, startIndex);
if (startIndex === -1 || endIndex === -1) throw new Error("Redundant start-choice section not found");
let next = source.slice(0, startIndex) + '        <section id="egitim-seviyeleri"' + source.slice(endIndex + redundantEnd.length);

const oldSectionPrefix = '<section id="egitim-seviyeleri" className="bg-[#f6f8fb] py-10 sm:py-14"><div className="container"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#0f8f8b]">Sınıfına uygun içerikleri keşfet</p><h2 className="mt-3 text-2xl font-black tracking-[-.045em] text-[#10233d] sm:text-3xl">Sınıfına uygun içerikleri keşfet</h2><p className="mt-3 text-sm text-[#687789]">Gerçek eğitim kategorilerinden seçerek test, doküman, video ve daha fazlasına ulaş.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setHeroClassName("1. Sınıf")} className="rounded-xl border border-[#dce3ea] bg-white px-5 py-2 text-xs font-bold text-[#4f6073] transition hover:border-[#0f9f9a] hover:text-[#0f8f8b]">İlkokul</button><button type="button" onClick={() => setHeroClassName("5. Sınıf")} className="rounded-xl bg-[#0f9f9a] px-5 py-2 text-xs font-bold text-white shadow-sm">Ortaokul</button><button type="button" onClick={() => setHeroClassName("9. Sınıf")} className="rounded-xl border border-[#dce3ea] bg-white px-5 py-2 text-xs font-bold text-[#4f6073] transition hover:border-[#0f9f9a] hover:text-[#0f8f8b]">Lise</button></div></div><div className="mx-auto mt-7 max-w-5xl"><div className="mb-5 flex w-fit items-center gap-1 rounded-full border border-[#dce7e4] bg-white p-1 shadow-sm" role="tablist" aria-label="Eğitim seviyesi">';
const newSectionPrefix = '<section id="egitim-seviyeleri" className="bg-[#f6f8fb] py-10 sm:py-14"><div className="container"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#0f8f8b]">Sınıfına uygun içerikleri keşfet</p><h2 className="mt-2 text-2xl font-black tracking-[-.045em] text-[#10233d] sm:text-3xl">Sınıfına uygun içerikleri keşfet</h2></div><div className="flex w-fit items-center gap-1 rounded-full border border-[#dce7e4] bg-white p-1 shadow-sm" role="tablist" aria-label="Eğitim seviyesi">';
if (!next.includes(oldSectionPrefix)) throw new Error("Expected duplicate tabs prefix not found");
next = next.replace(oldSectionPrefix, newSectionPrefix);

const oldContentWrapper = '<div className="mx-auto mt-7 max-w-5xl"><div className="mb-5 flex w-fit items-center gap-1 rounded-full border border-[#dce7e4] bg-white p-1 shadow-sm" role="tablist" aria-label="Eğitim seviyesi">';
if (next.includes(oldContentWrapper)) throw new Error("Old wrapper unexpectedly remains");
const oldGridStart = '<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">{visibleClassNodes.map';
const newGridStart = '<div className="mx-auto mt-8 grid max-w-[1400px] items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{visibleClassNodes.map';
if (!next.includes(oldGridStart)) throw new Error("Class grid start not found");
next = next.replace(oldGridStart, newGridStart);

const oldAside = '</div><aside className="rounded-2xl border border-[#e2e8e7] bg-white p-5 shadow-[0_12px_34px_rgba(6,27,46,.08)]">';
const newAside = '</div><aside className="rounded-2xl border border-[#e2e8e7] bg-white p-5 shadow-[0_12px_34px_rgba(6,27,46,.08)] lg:sticky lg:top-6 lg:h-fit">';
if (!next.includes(oldAside)) throw new Error("Popular topics aside marker not found");
next = next.replace(oldAside, newAside);

if (next === before) throw new Error("No changes made");
fs.writeFileSync(path, next);
console.log("Applied reference layout fixes: removed redundant start-choice section, removed duplicate tabs, and placed popular topics beside class cards.");
