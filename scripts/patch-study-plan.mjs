import fs from "node:fs";

const path = "client/src/pages/Home.tsx";
const source = fs.readFileSync(path, "utf8");
const start = source.indexOf('            <div className="relative mx-auto w-full max-w-[min(100%,430px)]');
const end = source.indexOf('          </div>\n        </section>', start);
if (start < 0 || end < 0) throw new Error("Çalışma planı blok sınırları bulunamadı");

const replacement = `            <div className="relative mx-auto min-h-[390px] w-full max-w-[650px] lg:ml-auto lg:-translate-y-1">
              <div className="pointer-events-none absolute -right-4 top-16 h-56 w-56 rounded-full bg-[#2c8d91]/20 blur-3xl" />
              <div className="absolute right-[6%] top-[8%] z-0 hidden w-[182px] rotate-[7deg] rounded-[18px] border border-white/60 bg-white/95 p-3 text-[#16324d] shadow-[0_18px_32px_rgba(15,39,62,.2)] sm:block">
                <p className="text-[10px] font-bold text-[#1668b5]">{miniHeroClassData[0]?.name ?? "Matematik"}</p>
                <div className="mt-3 flex items-center gap-2"><div className="grid h-12 w-12 place-items-center rounded-full border-[5px] border-[#dfeef1] border-t-[#1c83c7] text-[10px] font-black text-[#1c83c7]">{miniHeroClassData[0]?.summary.total ?? 0}</div><div className="min-w-0"><p className="truncate text-xs font-extrabold">{miniHeroClassData[0]?.summary.previews[0]?.title ?? "Yeni içerik"}</p><p className="mt-1 text-[10px] text-[#687b87]">{miniHeroClassData[0]?.summary.total ?? 0} içerik</p></div></div>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#0f8f8b]">Devam Et <ArrowRight size={12} /></span>
              </div>
              <div className="absolute right-[-1%] top-[28%] z-0 hidden w-[174px] rotate-[10deg] rounded-[18px] border border-white/60 bg-white/95 p-3 text-[#16324d] shadow-[0_18px_32px_rgba(15,39,62,.2)] sm:block">
                <p className="text-[10px] font-bold text-[#5540b5]">{miniHeroClassData[1]?.name ?? "Fen Bilimleri"}</p>
                <div className="mt-3 flex items-center gap-2"><div className="grid h-12 w-12 place-items-center rounded-full border-[5px] border-[#eeeafd] border-t-[#7055c9] text-[10px] font-black text-[#7055c9]">{miniHeroClassData[1]?.summary.total ?? 0}</div><div className="min-w-0"><p className="truncate text-xs font-extrabold">{miniHeroClassData[1]?.summary.previews[0]?.title ?? "Yeni içerik"}</p><p className="mt-1 text-[10px] text-[#687b87]">{miniHeroClassData[1]?.summary.total ?? 0} içerik</p></div></div>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#0f8f8b]">Devam Et <ArrowRight size={12} /></span>
              </div>
              <div className="relative z-10 mx-auto w-full max-w-[390px] rounded-[20px] border border-white/65 bg-white p-5 text-[#142f4a] shadow-[0_22px_48px_rgba(8,33,57,.28)] sm:mx-0 sm:ml-7 sm:max-w-[410px] sm:p-6">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e2f2eb] text-[#168b80]"><Target size={19} /></div><div><p className="text-base font-black tracking-[-.02em]">Bugünkü Çalışma Planın</p><p className="mt-0.5 text-[11px] text-[#78858d]">Gerçek ilerlemene göre hazırlandı</p></div></div>
                <div className="mt-5 flex items-center gap-4"><div className="relative grid h-[92px] w-[92px] shrink-0 place-items-center rounded-full" style={{ background: \`conic-gradient(#159c91 \${personalPlan?.progressPercent ?? 0}%, #e4f0ec 0)\` }}><div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-white text-center"><strong className="text-[20px] font-black text-[#167e79]">%{personalPlan?.progressPercent ?? 0}</strong><span className="text-[9px] font-bold text-[#7b8d8d]">Tamamlandı</span></div></div><div className="min-w-0"><p className="text-sm font-black text-[#18324c]">{heroLearning.subjectName} · {heroLearning.className}</p><p className="mt-3 text-[11px] font-semibold text-[#8a969c]">Sıradaki Konu</p><p className="mt-1 truncate text-base font-black text-[#18324c]">{personalPlan?.title ?? heroLearning.title}</p><p className="mt-2 text-[11px] text-[#6f7e86]">{personalPlan ? \\"30 dk önerilen çalışma\\" : \\"Kişisel planını oluştur\\"}</p></div></div>
                <button type="button" onClick={() => personalPlan ? goTo("icerikler") : accountAction()} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0f9f9a] text-sm font-black text-white shadow-[0_10px_20px_rgba(15,159,154,.2)] transition hover:bg-[#0b817e]">Devam Et <ArrowRight size={18} /></button>
                <div className="mt-5 flex items-center gap-3 border-t border-[#edf0eb] pt-4"><div><p className="text-xs font-black text-[#388478]">{personalPlan ? "5 gün üst üste çalıştın!" : "Çalışma serine başla"}</p><p className="mt-0.5 text-[10px] text-[#73848a]">Harikasın! Devam et!</p></div><div className="ml-auto flex gap-1.5">{["P","S","Ç","P","C","C","P"].map((day, index) => <span key={day + index} className="grid h-5 w-5 place-items-center rounded-full border border-[#c9ded7] text-[8px] font-black text-[#55766f]">{index < (personalPlan ? 6 : 0) ? "✓" : day}</span>)}</div></div>
              </div>
            </div>`;

fs.writeFileSync(path, source.slice(0, start) + replacement + source.slice(end), "utf8");
