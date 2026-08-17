import React from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

type ExportQuestion = { prompt: string; options?: string[] | null; answer?: string | null; explanation?: string | null };

export default function ExportDocumentActions({ title, questions, compact = false }: { title: string; questions: ExportQuestion[]; compact?: boolean }) {
  const exportMutation = (trpc as any).exports?.questions?.useMutation?.({
    onSuccess: ({ dataBase64, fileName, mimeType }: { dataBase64: string; fileName: string; mimeType: string }) => {
      const bytes = Uint8Array.from(atob(dataBase64), value => value.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(url);
      toast.success(`${fileName} indirilmeye hazır.`);
    },
    onError: (error: { message?: string }) => toast.error(error.message || "Dosya oluşturulamadı."),
  });
  const run = (format: "pdf" | "doc") => {
    if (!exportMutation) { toast.info("Dışa aktarma servisi hazır olduğunda kullanılabilir."); return; }
    exportMutation.mutate({ title, format, questions: questions.map(question => ({ prompt: question.prompt, options: question.options ?? [], answer: question.answer ?? "", explanation: question.explanation ?? "" })) });
  };
  const disabled = Boolean(exportMutation?.isPending) || questions.length === 0;
  return <div className="flex flex-wrap gap-2">
    <Button type="button" size={compact ? "sm" : "default"} variant="outline" disabled={disabled} onClick={() => run("pdf")} className="rounded-lg border-[#c7d9d1] text-[#286d60]"><FileText size={14} /> PDF indir</Button>
    <Button type="button" size={compact ? "sm" : "default"} variant="outline" disabled={disabled} onClick={() => run("doc")} className="rounded-lg border-[#c7d9d1] text-[#286d60]"><Download size={14} /> Word indir</Button>
  </div>;
}

export type { ExportQuestion };
