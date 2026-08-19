import React from "react";
import { trpc } from "@/lib/trpc";
import { BarChart3, CheckCircle2, CircleHelp, Clock3, FileQuestion, Layers3, ScanLine, Sparkles, WalletCards } from "lucide-react";

type Props = {
  compact?: boolean;
  className?: string;
};

const difficultyLabels = { easy: "Kolay", medium: "Orta", hard: "Zor" } as const;
const statusLabels = { draft: "Taslak", approved: "Onaylı", archived: "Arşiv" } as const;

function Metric({ label, value, tone, compact = false }: { label: string; value: number; tone: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl ${compact ? "p-2.5" : "p-4"} ${tone}`}>
      <p className={`${compact ? "text-[9px]" : "text-[11px]"} font-bold uppercase tracking-[.12em] opacity-70`}>{label}</p>
      <p className={`${compact ? "mt-1 text-xl" : "mt-2 text-2xl"} font-black tracking-[-.05em]`}>{value}</p>
    </div>
  );
}

export function QuestionProductionDashboard({ compact = false, className = "" }: Props) {
  const stats = trpc.panel.productionStats.useQuery(undefined, { staleTime: 60_000 });
  const data = stats.data;
  const scopeLabel = data?.scope === "all" ? "Tüm öğretmen ve admin üretimleri" : "Kendi soru üretimleriniz";

  if (stats.isLoading) {
    return <div className={`animate-pulse rounded-[28px] bg-white/70 p-6 ${className}`}><div className="h-5 w-48 rounded bg-slate-200" /><div className="mt-5 grid grid-cols-2 gap-3"><div className="h-20 rounded-2xl bg-slate-100" /><div className="h-20 rounded-2xl bg-slate-100" /></div></div>;
  }

  if (stats.isError) return null;

  const total = data?.total ?? 0;
  const maxDifficulty = Math.max(...Object.values(data?.difficulties ?? { easy: 0, medium: 0, hard: 0 }), 1);
  const aiUsage = data?.aiUsage;

  return (
    <section className={`rounded-[28px] border border-[#dfe3da] bg-white ${compact ? "p-2.5 shadow-[0_12px_26px_rgba(16,46,73,.15)] sm:p-3" : "p-5 shadow-[0_18px_45px_rgba(16,46,73,.07)] sm:p-6"} ${className}`} aria-labelledby="question-production-title">
      <div className={`flex flex-wrap items-start justify-between ${compact ? "gap-1.5" : "gap-4"}`}>
        <div>
          <div className="flex items-center gap-2 text-[#b88735]"><Sparkles size={16} /><span className="text-[10px] font-black uppercase tracking-[.16em]">Üretim özeti</span></div>
          <h2 id="question-production-title" className={`${compact ? "mt-0.5 text-[13px]" : "mt-2 text-xl"} font-black tracking-[-.04em] text-[#193f59]`}>Soru üretim istatistikleri</h2>
          <p className={`${compact ? "mt-0 text-[9px] leading-3.5" : "mt-1 text-sm"} text-[#6d7c82]`}>{scopeLabel} · Son 30 gün</p>
        </div>
        <div className={`grid ${compact ? "h-8 w-8 rounded-xl" : "h-11 w-11 rounded-2xl"} place-items-center bg-[#193f59] text-[#e4b45b] shadow-sm`}><BarChart3 size={compact ? 16 : 20} /></div>
      </div>

      <div className={`${compact ? "mt-2 gap-1.5" : "mt-5 gap-3"} grid ${compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
        <Metric compact={compact} label="Toplam soru" value={total} tone="bg-[#eaf1ee] text-[#1f6258]" />
        <Metric compact={compact} label="Son 30 gün" value={data?.recentCount ?? 0} tone="bg-[#fff3d7] text-[#8d621e]" />
        {!compact && <Metric compact={compact} label="Onaylı" value={data?.statuses.approved ?? 0} tone="bg-[#e8f0ed] text-[#1f6258]" />}
        {!compact && <Metric compact={compact} label="Taslak" value={data?.statuses.draft ?? 0} tone="bg-[#f4eee0] text-[#8d621e]" />}
      </div>

      {total === 0 ? (
        compact ? <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-[#fafbf8] px-1.5 py-1.5 text-[9px] font-bold text-[#718184]"><FileQuestion size={17} className="text-[#9aa8a5]" /> Henüz soru üretimi yok.</div> : <div className="mt-5 rounded-2xl border border-dashed border-[#d9ddd5] bg-[#fafbf8] p-5 text-center"><FileQuestion className="mx-auto text-[#9aa8a5]" size={25} /><p className="mt-2 text-sm font-bold text-[#52666d]">Henüz üretim kaydı bulunmuyor.</p><p className="mt-1 text-xs text-[#899598]">İlk sorunuzu oluşturduğunuzda özet burada görünecek.</p></div>
      ) : (
        <div className={`mt-5 grid gap-5 ${compact ? "" : "lg:grid-cols-[1fr_1fr]"}`}>
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#193f59]"><Layers3 size={15} /> Zorluk dağılımı</div>
            <div className="space-y-3">
              {(Object.entries(data?.difficulties ?? {}) as Array<[keyof typeof difficultyLabels, number]>).map(([key, value]) => (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-xs font-bold text-[#687b80]"><span>{difficultyLabels[key]}</span><span>{value}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#edf0ea]"><div className="h-full rounded-full bg-[#c49a43] transition-all" style={{ width: `${Math.max((value / maxDifficulty) * 100, value ? 8 : 0)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          {!compact && <div><div className="mb-3 flex items-center gap-2 text-sm font-black text-[#193f59]"><CircleHelp size={15} /> Durum özeti</div><div className="grid grid-cols-3 gap-2">{(Object.entries(data?.statuses ?? {}) as Array<[keyof typeof statusLabels, number]>).map(([key, value]) => <div key={key} className="rounded-2xl bg-[#f7f8f4] p-3 text-center"><p className="text-lg font-black text-[#193f59]">{value}</p><p className="mt-1 text-[10px] font-bold text-[#7c8b8d]">{statusLabels[key]}</p></div>)}</div><div className="mt-4 flex items-center gap-2 text-xs text-[#75868a]"><Clock3 size={14} /> Son üretimler canlı veriden okunur.</div></div>}
        </div>
      )}
      {!compact && <section className="mt-5 rounded-2xl border border-[#e7e1d2] bg-[linear-gradient(135deg,#fffaf0,#f7fbf8)] p-4" aria-labelledby="ai-usage-title"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-black text-[#193f59]"><Sparkles size={15} className="text-[#b88735]" /><h3 id="ai-usage-title">AI ve OCR kullanım özeti</h3></div><span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#8b7a55]">Taslak belgeler</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><Metric label="AI analiz" value={aiUsage?.aiAnalyzed ?? 0} tone="bg-[#eeeafd] text-[#5540e8]" /><Metric label="Başarılı AI" value={aiUsage?.aiCompleted ?? 0} tone="bg-[#e8f3ed] text-[#27745b]" /><Metric label="OCR denemesi" value={aiUsage?.ocrAttempted ?? 0} tone="bg-[#eaf2f8] text-[#285c78]" /><Metric label="OCR başarı" value={aiUsage?.ocrSuccessRate ?? 0} tone="bg-[#fff1d7] text-[#8d621e]" /></div><div className="mt-3 grid gap-2 text-xs text-[#65777b] sm:grid-cols-3"><div className="flex items-center gap-2 rounded-xl bg-white/75 px-3 py-2"><ScanLine size={14} className="text-[#285c78]" /><span>OCR tamamlandı: <strong className="text-[#193f59]">{aiUsage?.ocrCompleted ?? 0}</strong></span></div><div className="flex items-center gap-2 rounded-xl bg-white/75 px-3 py-2"><CheckCircle2 size={14} className="text-[#27745b]" /><span>Ortalama güven: <strong className="text-[#193f59]">{aiUsage?.averageOcrConfidence == null ? "—" : `%${aiUsage.averageOcrConfidence}`}</strong></span></div><div className="flex items-center gap-2 rounded-xl bg-white/75 px-3 py-2"><WalletCards size={14} className="text-[#b88735]" /><span>Maliyet: <strong className="text-[#193f59]">{aiUsage?.costTracked ? `$${aiUsage.estimatedCostUsd ?? "0.00"}` : "ölçüm bekleniyor"}</strong></span></div></div><p className="mt-2 text-[10px] leading-4 text-[#899598]">Maliyet bilgisi yalnızca sağlayıcı token kullanımı kaydedildiğinde hesaplanır; mevcut akışta tahmini ücret üretilmez.</p></section>}
      {compact && <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-[#6e8083]"><CheckCircle2 size={14} className="text-[#3b8b78]" /> Panelden ayrıntılı dağılımı inceleyin.</div>}
    </section>
  );
}
