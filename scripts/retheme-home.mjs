import fs from "node:fs";

const path = "client/src/pages/Home.tsx";
let source = fs.readFileSync(path, "utf8");

source = source.replace("  MessageCircle,\n", "  MessageCircle,\n  Megaphone,\n");
source = source.replace('bg-[#f7f4ed] text-[#102e49]', 'bg-white text-[#111827]');
source = source.replace('border-b border-[#dfe0d8]/80 bg-[#f7f4ed]/95', 'border-b border-[#eef0f5] bg-white/95');
source = source.replace('bg-[#102e49] text-[#f2c866] shadow-[0_9px_20px_rgba(16,46,73,.17)]', 'bg-[#5540e8] text-white shadow-[0_9px_20px_rgba(85,64,232,.22)]');
source = source.replace('text-[#102e49]">okul<span className="font-serif text-[#bd8331]">blog', 'text-[#5540e8]">okul<span className="font-serif text-[#7c3aed]">blog');
source = source.replace('text-[#17354d] outline-none transition placeholder:text-[#89979a] focus:ring-2 focus:ring-[#e3b75f]', 'text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#5540e8]');
source = source.replace('text-[#516674]', 'text-[#374151]');
source = source.replace('hover:text-[#102e49]', 'hover:text-[#5540e8]');
source = source.replace('text-[#28445a] hover:bg-[#ecece2]', 'text-[#374151] hover:bg-[#f3f4f6]');
source = source.replace('bg-[#102e49] px-5 font-bold text-white shadow-[0_10px_20px_rgba(16,46,73,.15)] hover:bg-[#1b425f]', 'bg-[#5540e8] px-5 font-bold text-white shadow-[0_10px_20px_rgba(85,64,232,.18)] hover:bg-[#4632cf]');
source = source.replace('bg-[#102e49]">{getHomeAccountLabel', 'bg-[#5540e8]">{getHomeAccountLabel');
source = source.replace('className="border-t border-[#dedfd7] bg-[#f7f4ed]', 'className="border-t border-[#eef0f5] bg-white');
source = source.replace('hover:bg-white">İçerikler', 'hover:bg-[#f4f2ff]">İçerikler');

source = source.replace('      <main>\n', '      <div className="border-b border-[#eef0f5] bg-[#fafaff] py-2 text-center text-xs font-medium text-[#4b5563]">Üst Reklam (Google AdSense / Firma Reklamı)</div>\n\n      <main>\n');
source = source.replace('relative h-[340px] overflow-hidden bg-[#173b58] text-white sm:h-[430px] lg:h-[500px]', 'relative h-[360px] overflow-hidden bg-[#2d55d9] text-white sm:h-[470px] lg:h-[560px]');
source = source.replace('bg-gradient-to-r from-[#102e49] via-[#245776] to-[#55427f]', 'bg-gradient-to-r from-[#1f5fe8] via-[#3f35c4] to-[#6322a0]');
source = source.replace('bg-[#f2c866] px-7 font-black text-[#17354d]', 'bg-[#ffd21a] px-7 font-black text-[#111827]');
source = source.replace('hover:bg-[#f7d982]', 'hover:bg-[#ffe45b]');
source = source.replace('focus:ring-[#f2c866]', 'focus:ring-[#ffd21a]');
source = source.replace('bg-[#f2c866]', 'bg-[#ffd21a]');
source = source.replace('bg-[#102e49] text-white', 'bg-gradient-to-br from-[#1f5fe8] via-[#3f35c4] to-[#6322a0] text-white');
source = source.replace('border-[#dfdfd5] bg-[#f7f4ed]', 'border-[#eef0f5] bg-white');
source = source.replace('border-[#e0e1d9] bg-[#f7f4ed]', 'border-[#eef0f5] bg-white');
source = source.replace('border-[#dfe1d9] bg-[#efede5]', 'border-[#111827] bg-[#111827]');
source = source.replace('bg-[#efede5]', 'bg-[#111827]');

const statsMarker = '        </section>\n\n        <section className="border-b border-[#dfdfd5]';
const statsSection = `        </section>\n\n        <section aria-label="Platform istatistikleri" className="relative z-10 -mt-8 bg-transparent">\n          <div className="container grid gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4">\n            {[\n              [overview.data?.content?.filter(item => item.contentType === "test").length ?? 0, "Aktif Test", "#2864d8"],\n              [overview.data?.content?.filter(item => item.contentType === "document").length ?? 0, "Doküman", "#5540e8"],\n              [overview.data?.content?.filter(item => item.contentType === "video").length ?? 0, "Video Ders", "#8b35d8"],\n              [overview.data?.educationCategories?.length ?? 0, "Eğitim Kategorisi", "#d62676"],\n            ].map(([value, label, color]) => (\n              <div key={label} className="rounded-[22px] bg-white px-5 py-5 text-center shadow-[0_14px_28px_rgba(31,41,55,.12)] ring-1 ring-[#eef0f5]">\n                <strong className="block text-3xl font-black tracking-[-.04em]" style={{ color }}>{value}</strong>\n                <span className="mt-1 block text-xs font-bold text-[#6b7280]">{label}</span>\n              </div>\n            ))}\n          </div>\n        </section>\n\n        <section className="border-b border-[#eef0f5]`;
source = source.replace(statsMarker, statsSection);

const levelsStart = '        <section id="egitim-seviyeleri"';
const levelsEnd = '        <section id="populer-kategoriler"';
const levelsStartIndex = source.indexOf(levelsStart);
const levelsEndIndex = source.indexOf(levelsEnd, levelsStartIndex);
if (levelsStartIndex !== -1 && levelsEndIndex !== -1) {
  const levelsSection = `        <section id="egitim-seviyeleri" className="bg-white py-16 sm:py-20"><div className="container"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#5540e8]">Kişisel başlangıç</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-[#111827] sm:text-4xl">Sınıfını seç, başarıya odaklan</h2><p className="mt-3 text-sm text-[#6b7280]">Sana en uygun içerikleri görmek için okuduğun sınıfı seçebilirsin.</p></div><div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-5">{["1. Sınıf","2. Sınıf","3. Sınıf","4. Sınıf","5. Sınıf","6. Sınıf","7. Sınıf","8. Sınıf","LGS"].map((grade, index) => <button key={grade} onClick={() => (isAuthenticated ? setLocation("/panel/kategoriler") : startLogin())} className={\`group rounded-[22px] border border-[#e5e7eb] border-t-4 \${grade === "LGS" ? "border-t-[#7c3aed]" : "border-t-[#1687d9]"} bg-white p-5 text-center shadow-[0_8px_20px_rgba(31,41,55,.04)] transition duration-200 hover:-translate-y-1 hover:border-[#5540e8] hover:shadow-[0_16px_30px_rgba(85,64,232,.14)] focus:outline-none focus:ring-2 focus:ring-[#5540e8] focus:ring-offset-2"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#f0f5ff] text-xl font-medium text-[#111827]">{index + 1}</span><strong className="mt-5 block text-sm font-extrabold text-[#111827]">{grade}</strong><span className="mt-2 block text-[10px] font-bold uppercase tracking-[.12em] text-[#9ca3af]">İçerikleri gör</span></button>)}</div></div></section>\n\n`;
  source = source.slice(0, levelsStartIndex) + levelsSection + source.slice(levelsEndIndex);
}

const contentStart = '        <section id="icerikler"';
const contentEnd = '        <section id="sinavlar"';
const contentStartIndex = source.indexOf(contentStart);
const contentEndIndex = source.indexOf(contentEnd, contentStartIndex);
if (contentStartIndex !== -1 && contentEndIndex !== -1) {
  const contentSection = `        <section id="icerikler" className="bg-[#fafaff] py-16 sm:py-20"><div className="container"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#5540e8]">Dersleri keşfet</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-[#111827] sm:text-4xl">Dersler için kapsamlı içerikler seni bekliyor.</h2><p className="mt-3 text-sm text-[#6b7280]">Gerçek eğitim kategorilerinden seçerek test, doküman, video ve daha fazlasına ulaş.</p></div>{overview.isLoading ? <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[185px] animate-pulse rounded-[24px] bg-white" />)}</div> : overview.isError ? <div className="mx-auto mt-10 max-w-5xl rounded-2xl bg-white p-6 text-sm text-[#6b7280]">Dersler şu anda yüklenemiyor.</div> : <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">{(displayedEducationCategories.length ? displayedEducationCategories : educationCategories).slice(0, 6).map((category, index) => { const Icon = categoryIcon(category.name); const tones = ["from-[#2874ed] to-[#2364d7]", "from-[#a43ceb] to-[#7c2bd4]", "from-[#16b85b] to-[#0d9b49]", "from-[#ef3c3c] to-[#df2424]", "from-[#f1b900] to-[#d99400]", "from-[#df3a9b] to-[#c9217d]"]; return <button key={category.id} onClick={() => { setSelectedCategoryId(category.id); window.setTimeout(() => goTo("kategori-sonuclar"), 0); }} className="group overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white text-left shadow-[0_8px_20px_rgba(31,41,55,.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(85,64,232,.14)]"><div className={\`flex h-32 items-center justify-center bg-gradient-to-br \${tones[index % tones.length]} text-white\`}><Icon size={38} strokeWidth={1.7} /></div><div className="p-5"><h3 className="text-lg font-extrabold text-[#111827]">{category.name}</h3><p className="mt-1 text-sm text-[#6b7280]">{categoryLevelLabel(category.level)}</p></div></button>; })}</div>}</div></section>\n\n`;
  source = source.slice(0, contentStartIndex) + contentSection + source.slice(contentEndIndex);
}

const footerStart = '      <footer className=';
const footerEnd = '      </div>\n    </>'; 
const footerStartIndex = source.indexOf(footerStart);
const footerEndIndex = source.indexOf(footerEnd, footerStartIndex);
if (footerStartIndex !== -1 && footerEndIndex !== -1) {
  const footer = `      <footer className="bg-[#111827] text-white"><div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4"><div><div className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#5540e8] text-white"><GraduationCap size={18} /></span> okul<span className="text-[#ffd21a]">blog</span></div><p className="mt-4 max-w-xs text-sm leading-6 text-[#9ca3af]">Öğrencilerin sınav yolculuğunda güvenilir içerik ve düzenli öğrenme alanı.</p></div><div><h3 className="font-bold">Keşfet</h3><div className="mt-4 grid gap-3 text-sm text-[#9ca3af]"><button onClick={() => goTo("icerikler")} className="text-left transition hover:text-white">Tüm dersler</button><button onClick={() => goTo("egitim-seviyeleri")} className="text-left transition hover:text-white">Sınıf seçimi</button><button onClick={() => goTo("sinavlar")} className="text-left transition hover:text-white">Sınav alanı</button></div></div><div><h3 className="font-bold">Destek</h3><div className="mt-4 grid gap-3 text-sm text-[#9ca3af]"><button onClick={() => goTo("soru-cevap")} className="text-left transition hover:text-white">Soru-Cevap</button><button onClick={() => setLocation("/soru-cevap")} className="text-left transition hover:text-white">İletişim</button><button onClick={openPanel} className="text-left transition hover:text-white">Yönetim Paneli</button></div></div><div><h3 className="font-bold">Bülten</h3><p className="mt-4 text-sm text-[#9ca3af]">Yeni içeriklerden haberdar ol.</p><div className="mt-3 flex"><input aria-label="E-posta" placeholder="E-posta" className="min-w-0 flex-1 rounded-l-xl border-0 bg-[#1f2937] px-3 py-2 text-sm text-white outline-none placeholder:text-[#6b7280] focus:ring-2 focus:ring-[#5540e8]" /><button aria-label="Bültene katıl" className="rounded-r-xl bg-[#5540e8] px-4 text-white transition hover:bg-[#4632cf]"><ArrowRight size={16} /></button></div></div></div><div className="container border-t border-white/10 py-5 text-center text-xs text-[#6b7280]">© {new Date().getFullYear()} OkulBlog. Tüm hakları saklıdır.</div></footer>\n`;
  source = source.slice(0, footerStartIndex) + footer + source.slice(footerEndIndex);
}

fs.writeFileSync(path, source);
