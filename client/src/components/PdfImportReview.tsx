import React, { useMemo, useState } from "react";
import { Check, Image as ImageIcon, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PdfReviewQuestion = {
  sourceNumber: string;
  prompt: string;
  options: string[];
  answer: string | null;
  questionType: "multiple-choice" | "open-ended";
  confidence: "high" | "medium" | "low";
  confidenceScore: number;
  answerMatched: boolean;
  hasEmbeddedImage: boolean;
  page: number;
  warning: string | null;
};

type Props = {
  questions: PdfReviewQuestion[];
  onConfirm: (questions: PdfReviewQuestion[]) => void;
  onCancel: () => void;
};

export default function PdfImportReview({ questions, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState(() => new Set(questions.map((_, index) => index)));
  const allSelected = selected.size === questions.length;
  const selectedQuestions = useMemo(() => questions.filter((_, index) => selected.has(index)), [questions, selected]);
  const toggle = (index: number) => setSelected(current => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; });
  return <div className="space-y-4 rounded-2xl border border-[#dfeae3] bg-white p-4 shadow-sm" data-testid="pdf-import-review">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-[#29465a]">PDF sorularını onayla</p><p className="text-xs text-[#71838b]">İçe aktarılacak soruları seçin. Düşük güvenli kayıtları kaydetmeden önce düzenleyin.</p></div><span className="rounded-full bg-[#e8f4ed] px-3 py-1 text-xs font-bold text-[#286d60]">{selected.size}/{questions.length} seçili</span></div>
    <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setSelected(allSelected ? new Set() : new Set(questions.map((_, index) => index)))}>{allSelected ? "Seçimi kaldır" : "Tümünü seç"}</Button><span className="rounded-lg bg-[#f7f8f4] px-3 py-2 text-xs text-[#71838b]">{questions.filter(question => question.confidence === "low").length} düşük güvenli</span></div>
    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">{questions.map((question, index) => { const checked = selected.has(index); const score = Math.round(question.confidenceScore * 100); const tone = question.confidence === "high" ? "bg-[#e5f3ed] text-[#286d60]" : question.confidence === "medium" ? "bg-[#fff4d9] text-[#94702a]" : "bg-[#fdebea] text-[#a4514c]"; return <label key={`${question.sourceNumber}-${index}`} className={`block cursor-pointer rounded-xl border p-3 transition ${checked ? "border-[#a8d4c1] bg-[#fbfefa]" : "border-[#e8ece5] bg-[#fafbf9] opacity-70"}`}><div className="flex gap-3"><input type="checkbox" checked={checked} onChange={() => toggle(index)} className="mt-1 h-4 w-4 accent-[#286d60]" aria-label={`PDF soru ${question.sourceNumber} seç`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[#29465a]">Soru {question.sourceNumber}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone}`}>Güven %{score} · {question.confidence === "high" ? "Yüksek" : question.confidence === "medium" ? "Orta" : "Düşük"}</span><span className="text-[10px] text-[#8a9897]">Sayfa {question.page}</span>{question.hasEmbeddedImage && <span className="inline-flex items-center gap-1 rounded-full bg-[#eee9fb] px-2 py-1 text-[10px] font-bold text-[#68558e]"><ImageIcon size={11} /> Görsel algılandı</span>}</div><p className="mt-2 line-clamp-3 text-sm text-[#526b71]">{question.prompt}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#71838b]"><span>{question.options.length >= 2 ? `${question.options.length} seçenek` : "Açık uçlu"}</span>{question.answerMatched ? <span className="inline-flex items-center gap-1 text-[#286d60]"><Check size={12} /> Cevap eşleşti: {question.answer}</span> : question.warning && <span className="inline-flex items-center gap-1 text-[#a4514c]"><ShieldAlert size={12} /> {question.warning}</span>}</div></div></div></label>; })}</div>
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onCancel}>İptal</Button><Button type="button" disabled={!selectedQuestions.length} onClick={() => onConfirm(selectedQuestions)} className="bg-[#18344f]">{selectedQuestions.length} soruyu editöre aktar</Button></div>
  </div>;
}
