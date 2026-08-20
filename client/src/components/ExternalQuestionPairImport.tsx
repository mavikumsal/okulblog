import React, { useMemo, useState } from "react";
import { Check, FileKey2, FileText, Pencil, ShieldAlert, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { PdfReviewQuestion } from "@/components/PdfImportReview";

type Props = {
  topicTag: string;
  gradeLevel: string;
  categoryId?: number;
  onConfirm: (questions: PdfReviewQuestion[]) => void;
};

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) binary += String.fromCharCode(...Array.from(bytes.subarray(index, index + chunk)));
  return btoa(binary);
}

function confidenceTone(value: PdfReviewQuestion["confidence"]) {
  return value === "high" ? "bg-[#e5f3ed] text-[#286d60]" : value === "medium" ? "bg-[#fff4d9] text-[#94702a]" : "bg-[#fdebea] text-[#a4514c]";
}

export default function ExternalQuestionPairImport({ topicTag, gradeLevel, categoryId, onConfirm }: Props) {
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [items, setItems] = useState<PdfReviewQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const parsePair = trpc.files.parseQuestionPdfPair.useMutation({
    onSuccess: result => {
      const next = result.questions as PdfReviewQuestion[];
      setItems(next);
      setSelected(new Set(next.map((_, index) => index)));
      toast.success(`${result.matchedCount}/${next.length} cevap eşleştirildi. Sonuçlar taslak olarak hazır.`);
    },
    onError: error => toast.error(error.message || "Soru ve cevap PDF’leri ayrıştırılamadı."),
  });
  const selectedItems = useMemo(() => items.filter((_, index) => selected.has(index)), [items, selected]);
  const updateItem = (index: number, patch: Partial<PdfReviewQuestion>) => setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const run = async () => {
    if (!questionFile || !answerFile) { toast.error("Soru PDF’i ve cevap anahtarı PDF’ini birlikte seçin."); return; }
    parsePair.mutate({ questionFileName: questionFile.name, questionDataBase64: toBase64(await questionFile.arrayBuffer()), answerKeyFileName: answerFile.name, answerKeyDataBase64: toBase64(await answerFile.arrayBuffer()), topicTag: topicTag.trim() || null, gradeLevel: gradeLevel || null, categoryId: categoryId ?? null });
  };
  return <div className="mt-3 rounded-xl border border-[#dce8e2] bg-[#fbfefa] p-3" data-testid="external-question-pair-import">
    <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e5f3ed] text-[#286d60]"><FileKey2 size={17} /></span><div><p className="text-xs font-bold text-[#54766f]">Yayın + cevap anahtarı pilot aktarımı</p><p className="text-[11px] leading-5 text-[#71838b]">Yalnızca yetkili içerikleri seçin. OCR ve cevap eşleştirme sonrası sorular kaydedilmeden önce düzenlenir.</p></div></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#cfe1d8] bg-white px-3 py-2 text-xs font-semibold text-[#456b62]"><FileText size={14} />{questionFile?.name ?? "Soru yayını PDF’i"}<input type="file" accept="application/pdf" className="hidden" onChange={event => setQuestionFile(event.target.files?.[0] ?? null)} /></label><label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#cfe1d8] bg-white px-3 py-2 text-xs font-semibold text-[#456b62]"><FileKey2 size={14} />{answerFile?.name ?? "Cevap anahtarı PDF’i"}<input type="file" accept="application/pdf" className="hidden" onChange={event => setAnswerFile(event.target.files?.[0] ?? null)} /></label></div>
    <Button type="button" size="sm" disabled={!questionFile || !answerFile || parsePair.isPending} onClick={() => void run()} className="mt-3 rounded-lg bg-[#286d60]"><UploadCloud size={14} />{parsePair.isPending ? "OCR ve eşleştirme yapılıyor..." : "Pilot aktarımı başlat"}</Button>
    {items.length > 0 && <div className="mt-4 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#eef7f1] px-3 py-2 text-xs text-[#54766f]"><span><strong>{selectedItems.length}/{items.length}</strong> soru seçili</span><span>Her soru taslak kalır; yayınlanmaz.</span></div><div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">{items.map((item, index) => { const checked = selected.has(index); return <div key={`${item.sourceNumber}-${index}`} className={`rounded-xl border p-3 ${checked ? "border-[#abd3c1] bg-white" : "border-[#ecefea] bg-[#fafbf9] opacity-70"}`}><div className="flex gap-2"><input type="checkbox" checked={checked} onChange={() => setSelected(current => { const next = new Set(current); next.has(index) ? next.delete(index) : next.add(index); return next; })} className="mt-1 h-4 w-4 accent-[#286d60]" aria-label={`Pilot soru ${item.sourceNumber} seç`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[#29465a]">Soru {item.sourceNumber}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${confidenceTone(item.confidence)}`}>Güven %{Math.round(item.confidenceScore * 100)}</span><span className="text-[10px] text-[#8a9897]">Sayfa {item.page}</span>{item.answerMatched ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#286d60]"><Check size={12} /> Cevap: {item.answer}</span> : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#a4514c]"><ShieldAlert size={12} /> Manuel kontrol</span>}</div><Textarea value={item.prompt} onChange={event => updateItem(index, { prompt: event.target.value })} className="mt-2 min-h-20 rounded-lg bg-white text-xs" aria-label={`Soru ${item.sourceNumber} metni`} />{item.options.length > 0 && <div className="mt-2 grid gap-1 sm:grid-cols-2">{item.options.map((option, optionIndex) => <input key={optionIndex} value={option} onChange={event => updateItem(index, { options: item.options.map((value, current) => current === optionIndex ? event.target.value : value) })} className="h-8 rounded-lg border border-[#e7ece8] px-2 text-xs" aria-label={`Soru ${item.sourceNumber} ${String.fromCharCode(65 + optionIndex)} seçeneği`} />)}</div>}<div className="mt-2 flex items-center gap-2"><Pencil size={12} className="text-[#819095]" /><select value={item.answer ?? ""} onChange={event => updateItem(index, { answer: event.target.value, answerMatched: Boolean(event.target.value), warning: event.target.value ? null : "Doğru cevabı seçin." })} className="h-8 rounded-lg border border-[#e7ece8] bg-white px-2 text-xs" aria-label={`Soru ${item.sourceNumber} doğru cevabı`}><option value="">Doğru cevabı seçin</option>{item.options.filter(Boolean).map((option, optionIndex) => <option key={optionIndex} value={option}>{String.fromCharCode(65 + optionIndex)} · {option}</option>)}</select></div>{item.warning && <p className="mt-1 text-[10px] text-[#a4514c]">{item.warning}</p>}</div></div></div>; })}</div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => { setItems([]); setSelected(new Set()); }}>Temizle</Button><Button type="button" disabled={!selectedItems.length} onClick={() => onConfirm(selectedItems)} className="bg-[#18344f]">{selectedItems.length} soruyu editöre aktar</Button></div></div>}
  </div>;
}
