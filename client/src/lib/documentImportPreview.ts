export type DocumentAiStatus = "completed" | "failed" | "processing" | "not_started" | string;

export function getDocumentPreviewTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0).map(tag => tag.trim()).slice(0, 12);
}

export function getDocumentAiStatusLabel(status: DocumentAiStatus): string {
  if (status === "completed") return "Tamamlandı";
  if (status === "failed") return "Başarısız";
  if (status === "processing") return "İşleniyor";
  return "Bekliyor";
}
