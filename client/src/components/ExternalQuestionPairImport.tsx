import React, { useMemo, useRef, useState } from "react";
import { Check, Crop, FileKey2, FileText, Image as ImageIcon, Move, Save, ShieldAlert, UploadCloud } from "lucide-react";
import { COOKIE_NAME } from "@shared/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { PdfReviewQuestion } from "@/components/PdfImportReview";
import { clampCropBox, moveCropBox, resizeCropBox, type CropBox } from "@/lib/questionCrop";

type Props = {
  topicTag: string;
  gradeLevel: string;
  categoryId?: number;
  categoryOptions?: Array<{ id: number; name: string }>;
  onConfirm: (questions: PdfReviewQuestion[]) => void;
};

type CropInteraction = { mode: "move" | "resize"; startX: number; startY: number; initial: CropBox };

function confidenceTone(value: PdfReviewQuestion["confidence"]) {
  return value === "high" ? "bg-[#e5f3ed] text-[#286d60]" : value === "medium" ? "bg-[#fff4d9] text-[#94702a]" : "bg-[#fdebea] text-[#a4514c]";
}

function pageImage(item: PdfReviewQuestion) {
  return item.sourcePageImageDataBase64 ? `data:image/webp;base64,${item.sourcePageImageDataBase64}` : item.embeddedImageUrl ?? item.cropImageDataUrl ?? null;
}

export default function ExternalQuestionPairImport({ topicTag, gradeLevel, categoryId, categoryOptions = [], onConfirm }: Props) {
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [items, setItems] = useState<PdfReviewQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [bulkCategoryId, setBulkCategoryId] = useState(String(categoryId ?? ""));
  const [bulkDifficulty, setBulkDifficulty] = useState<PdfReviewQuestion["difficulty"]>("medium");
  const [bulkOutcome, setBulkOutcome] = useState("");
  const [cropBox, setCropBox] = useState<CropBox>({ x: 5, y: 5, width: 90, height: 90 });
  const [cropMode, setCropMode] = useState(false);
  const [cropInteraction, setCropInteraction] = useState<CropInteraction | null>(null);
  const cropCanvasRef = useRef<HTMLDivElement | null>(null);
  const parseStagedPair = trpc.files.parseQuestionPdfPairFromStorage.useMutation({
    onSuccess: (result: { questions: PdfReviewQuestion[]; matchedCount: number }) => {
      const next = result.questions as PdfReviewQuestion[];
      setItems(next);
      setSelected(new Set(next.map((_, index) => index)));
      setActiveIndex(0);
      toast.success(`${result.matchedCount}/${next.length} cevap eşleştirildi. Sonuçlar taslak olarak hazır.`);
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Soru ve cevap PDF’leri ayrıştırılamadı."),
  });
  const selectedItems = useMemo(() => items.filter((_, index) => selected.has(index)), [items, selected]);
  const activeItem = items[activeIndex] ?? null;
  const updateItem = (index: number, patch: Partial<PdfReviewQuestion>) => setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const applyBulkMetadata = () => {
    if (!selected.size) return toast.error("Önce en az bir soru seçin.");
    setItems(current => current.map((item, index) => selected.has(index) ? { ...item, categoryId: bulkCategoryId ? Number(bulkCategoryId) : null, difficulty: bulkDifficulty, learningOutcome: bulkOutcome.trim() || null } : item));
    toast.success(`${selected.size} soruya kategori, zorluk ve kazanım uygulandı.`);
  };
  const beginCropInteraction = (event: React.PointerEvent<HTMLElement>, mode: CropInteraction["mode"]) => {
    if (!cropMode) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setCropInteraction({ mode, startX: event.clientX, startY: event.clientY, initial: cropBox });
  };
  const updateCropInteraction = (event: React.PointerEvent<HTMLElement>) => {
    if (!cropInteraction || !cropCanvasRef.current) return;
    const rect = cropCanvasRef.current.getBoundingClientRect();
    const dx = ((event.clientX - cropInteraction.startX) / rect.width) * 100;
    const dy = ((event.clientY - cropInteraction.startY) / rect.height) * 100;
    const initial = cropInteraction.initial;
    setCropBox(cropInteraction.mode === "move" ? moveCropBox(initial, dx, dy) : resizeCropBox(initial, dx, dy));
  };
  const endCropInteraction = (event: React.PointerEvent<HTMLElement>) => {
    if (cropInteraction) event.currentTarget.releasePointerCapture?.(event.pointerId);
    setCropInteraction(null);
  };
  const setManualCropBox = (patch: Partial<CropBox>) => setCropBox(current => clampCropBox({ ...current, ...patch }));
  const cropActive = async () => {
    if (!activeItem?.sourcePageImageDataBase64) return toast.error("Bu soru için kaynak sayfa görüntüsü bulunamadı.");
    const image = new Image();
    image.src = `data:image/webp;base64,${activeItem.sourcePageImageDataBase64}`;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Görüntü yüklenemedi.")); });
    const canvas = document.createElement("canvas");
    const sx = Math.round(image.width * cropBox.x / 100);
    const sy = Math.round(image.height * cropBox.y / 100);
    const sw = Math.round(image.width * cropBox.width / 100);
    const sh = Math.round(image.height * cropBox.height / 100);
    canvas.width = Math.max(1, sw); canvas.height = Math.max(1, sh);
    canvas.getContext("2d")?.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
    updateItem(activeIndex, { cropImageDataUrl: canvas.toDataURL("image/webp", 0.82), warning: activeItem.warning?.replace("manüel", "manuel") ?? null });
    setCropMode(false);
    toast.success(`Soru ${activeItem.sourceNumber} için kırpılmış görsel hazırlandı.`);
  };
    const run = async () => {
    if (!questionFile || !answerFile) { toast.error("Soru PDF’i ve cevap anahtarı PDF’ini birlikte seçin."); return; }
    try {
      const stageDirect = async (file: File) => {
        const form = new FormData();
        form.append("file", file, file.name);
        let authorization: Record<string, string> = {};
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          const prefix = `${COOKIE_NAME}=`;
          const pair = raw?.split(";").find(value => value.trim().startsWith(prefix));
          const token = pair?.trim().slice(prefix.length);
          if (token) authorization = { Authorization: `Bearer ${token}` };
        } catch {
          // Cookie auth remains available when sessionStorage is unavailable.
        }
        const response = await fetch(`/api/trpc/files.stageQuestionPdfUpload?fileName=${encodeURIComponent(file.name)}`, {
          method: "POST",
          body: form,
          credentials: "include",
          headers: authorization,
        });
        const raw = await response.text();
        let payload: { fileName?: string; storageKey?: string; error?: string };
        try {
          payload = JSON.parse(raw) as typeof payload;
        } catch {
          throw new Error(`PDF staging sunucusu JSON yerine HTML döndürdü (HTTP ${response.status}).`);
        }
        if (!response.ok || !payload.storageKey || !payload.fileName) {
          throw new Error(payload.error ?? `PDF staging başarısız (HTTP ${response.status}).`);
        }
        return payload as { fileName: string; storageKey: string };
      };
      const [question, answerKey] = await Promise.all([stageDirect(questionFile), stageDirect(answerFile)]);
      parseStagedPair.mutate({ questionFileName: question.fileName, questionStorageKey: question.storageKey, answerKeyFileName: answerKey.fileName, answerKeyStorageKey: answerKey.storageKey, topicTag: topicTag.trim() || null, gradeLevel: gradeLevel || null, categoryId: categoryId ?? null });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF’ler staging alanına yüklenemedi.");
    }
  };
  return <div id="pilot-question-import" className="mt-3 rounded-xl border border-[#dce8e2] bg-[#fbfefa] p-3" data-testid="external-question-pair-import">
    <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e5f3ed] text-[#286d60]"><FileKey2 size={17} /></span><div><p className="text-xs font-bold text-[#54766f]">Yayın + cevap anahtarı pilot aktarımı</p><p className="text-[11px] leading-5 text-[#71838b]">Yalnızca yetkili içerikleri seçin. Düşük güvenli satırları görsel üzerinden düzeltin; hiçbir soru otomatik yayınlanmaz.</p></div></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#cfe1d8] bg-white px-3 py-2 text-xs font-semibold text-[#456b62]"><FileText size={14} />{questionFile?.name ?? "Soru yayını PDF’i"}<input id="pilot-question-pdf" type="file" accept="application/pdf" className="min-w-0 flex-1 text-[10px]" onChange={event => setQuestionFile(event.target.files?.[0] ?? null)} /></label><label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#cfe1d8] bg-white px-3 py-2 text-xs font-semibold text-[#456b62]"><FileKey2 size={14} />{answerFile?.name ?? "Cevap anahtarı PDF’i"}<input id="pilot-answer-pdf" type="file" accept="application/pdf" className="min-w-0 flex-1 text-[10px]" onChange={event => setAnswerFile(event.target.files?.[0] ?? null)} /></label></div>
    <Button type="button" size="sm" disabled={!questionFile || !answerFile || parseStagedPair.isPending} onClick={() => void run()} className="mt-3 rounded-lg bg-[#286d60]"><UploadCloud size={14} />{parseStagedPair.isPending ? "PDF’ler yükleniyor ve OCR yapılıyor..." : "Pilot aktarımı başlat"}</Button>
    {items.length > 0 && <div className="mt-4 space-y-3">
      <div className="grid gap-2 rounded-lg border border-[#dbe9df] bg-white p-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end"><label className="text-[11px] font-bold text-[#54766f]">Toplu kategori<select value={bulkCategoryId} onChange={event => setBulkCategoryId(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#e2ebe5] bg-white px-2 text-xs"><option value="">Kategori seçilmedi</option>{categoryOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label><label className="text-[11px] font-bold text-[#54766f]">Zorluk<select value={bulkDifficulty} onChange={event => setBulkDifficulty(event.target.value as PdfReviewQuestion["difficulty"])} className="mt-1 h-9 rounded-lg border border-[#e2ebe5] bg-white px-2 text-xs"><option value="easy">Kolay</option><option value="medium">Orta</option><option value="hard">Zor</option></select></label><label className="text-[11px] font-bold text-[#54766f]">Kazanım<Input value={bulkOutcome} onChange={event => setBulkOutcome(event.target.value)} placeholder="Örn. Ritmik sayar" className="mt-1 h-9 text-xs" /></label><Button type="button" size="sm" onClick={applyBulkMetadata} className="bg-[#286d60]"><Save size={14} />Seçilenlere uygula</Button></div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#eef7f1] px-3 py-2 text-xs text-[#54766f]"><span><strong>{selectedItems.length}/{items.length}</strong> soru seçili</span><span>Split-screen önizleme için listeden soru seçin.</span></div>
      {activeItem && <div className="rounded-xl border border-[#dfeae3] bg-white p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold text-[#29465a]">Soru {activeItem.sourceNumber} · Sayfa {activeItem.page}</p><p className="text-[10px] text-[#71838b]">Orijinal PDF görüntüsü ve OCR metni yan yana</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${confidenceTone(activeItem.confidence)}`}>Güven %{Math.round(activeItem.confidenceScore * 100)}</span><Button type="button" size="sm" variant="outline" onClick={() => setCropMode(mode => !mode)}><Crop size={14} />{cropMode ? "Kırpmayı kapat" : "Görseli kırp"}</Button></div></div><div className="grid gap-3 lg:grid-cols-2"><div className="rounded-lg bg-[#f5f8f5] p-2"><div className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#71838b]"><ImageIcon size={13} />Orijinal PDF</div>{pageImage(activeItem) ? <div ref={cropCanvasRef} className={`relative mx-auto max-h-[460px] w-full overflow-hidden rounded-md border border-[#dde8df] bg-[#f5f8f5] ${cropMode ? "touch-none" : ""}`} onPointerMove={updateCropInteraction} onPointerUp={endCropInteraction} onPointerCancel={endCropInteraction}><img src={pageImage(activeItem) ?? ""} alt={`Soru ${activeItem.sourceNumber} PDF sayfası`} draggable={false} className="block max-h-[460px] w-full object-contain" />{cropMode && <div className="absolute cursor-move border-2 border-[#286d60] bg-[#b8e6d233] shadow-[0_0_0_9999px_rgba(16,39,52,0.28)]" style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.width}%`, height: `${cropBox.height}%` }} onPointerDown={event => beginCropInteraction(event, "move")}><span className="absolute -left-1 -top-1 h-3 w-3 rounded-full border border-white bg-[#286d60]" /><span className="absolute -bottom-1 -right-1 h-4 w-4 cursor-se-resize rounded-sm border-2 border-white bg-[#e8bf62]" onPointerDown={event => { event.stopPropagation(); beginCropInteraction(event, "resize"); }} /><span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-[#18344fdd] px-1.5 py-1 text-[9px] font-bold text-white"><Move size={10} />Sürükle</span></div>}</div> : <div className="grid min-h-40 place-items-center rounded-md border border-dashed border-[#cfded4] text-xs text-[#8a9897]">Sayfa görüntüsü bulunamadı</div>}{cropMode && <div className="mt-2 grid grid-cols-4 gap-1"><Input type="number" min="0" max="90" value={cropBox.x} onChange={event => setManualCropBox({ x: Number(event.target.value) })} aria-label="Kırpma X" /><Input type="number" min="0" max="90" value={cropBox.y} onChange={event => setManualCropBox({ y: Number(event.target.value) })} aria-label="Kırpma Y" /><Input type="number" min="10" max="100" value={cropBox.width} onChange={event => setManualCropBox({ width: Number(event.target.value) })} aria-label="Kırpma genişliği" /><Input type="number" min="10" max="100" value={cropBox.height} onChange={event => setManualCropBox({ height: Number(event.target.value) })} aria-label="Kırpma yüksekliği" /><Button type="button" size="sm" className="col-span-4 bg-[#18344f]" onClick={() => void cropActive()}>Kırpmayı uygula</Button></div>}</div><div><div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#71838b]">OCR metni · manuel düzeltme</div><Textarea value={activeItem.ocrText ?? activeItem.prompt} onChange={event => updateItem(activeIndex, { ocrText: event.target.value, prompt: event.target.value })} className="min-h-[330px] rounded-lg text-xs" aria-label={`Soru ${activeItem.sourceNumber} OCR metni`} /><p className="mt-2 text-[10px] leading-4 text-[#8a9897]">OCR hatasını düzelttiğinizde soru metni de güncellenir. Seçenekleri aşağıdaki kartta ayrıca düzenleyebilirsiniz.</p></div></div></div>}
      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">{items.map((item, index) => { const checked = selected.has(index); return <div key={`${item.sourceNumber}-${index}`} onClick={() => setActiveIndex(index)} className={`cursor-pointer rounded-xl border p-3 ${activeIndex === index ? "border-[#286d60] ring-2 ring-[#d7eee3]" : checked ? "border-[#abd3c1]" : "border-[#ecefea] opacity-70"} bg-white`}><div className="flex gap-2"><input type="checkbox" checked={checked} onChange={event => { event.stopPropagation(); setSelected(current => { const next = new Set(current); next.has(index) ? next.delete(index) : next.add(index); return next; }); }} className="mt-1 h-4 w-4 accent-[#286d60]" aria-label={`Pilot soru ${item.sourceNumber} seç`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[#29465a]">Soru {item.sourceNumber}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${confidenceTone(item.confidence)}`}>Güven %{Math.round(item.confidenceScore * 100)}</span>{item.answerMatched ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#286d60]"><Check size={12} /> Cevap: {item.answer}</span> : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#a4514c]"><ShieldAlert size={12} /> Manuel kontrol</span>}</div><p className="mt-1 line-clamp-2 text-xs text-[#526b71]">{item.prompt}</p><div className="mt-1 text-[10px] text-[#71838b]">{item.difficulty ?? "Orta"} · {item.learningOutcome ?? "Kazanım atanmadı"}</div></div></div></div>; })}</div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => { setItems([]); setSelected(new Set()); }}>Temizle</Button><Button type="button" disabled={!selectedItems.length} onClick={() => onConfirm(selectedItems)} className="bg-[#18344f]">{selectedItems.length} soruyu editöre aktar</Button></div>
    </div>}
  </div>;
}
