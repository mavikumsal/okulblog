export const DOCUMENT_AI_MAX_CHARS = 12_000;

export function shouldAnalyzeDocumentText(analyzeWithAi: boolean, text: string) {
  return analyzeWithAi && text.trim().length >= 40;
}

export function buildDocumentAiPrompt(text: string) {
  return `Başlık, kısa özet ve en fazla 6 etiket üret. Metin:\n${text.slice(0, DOCUMENT_AI_MAX_CHARS)}`;
}

export function normalizeDocumentAiMetadata(value: unknown, fallbackTitle: string) {
  const parsed = value && typeof value === "object" ? value as { title?: unknown; summary?: unknown; tags?: unknown } : {};
  const title = String(parsed.title || fallbackTitle).trim().slice(0, 220);
  const summary = String(parsed.summary || "").trim().slice(0, 3000);
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.map(tag => String(tag).trim().slice(0, 50)).filter(Boolean).slice(0, 6)
    : [];
  return { title, summary, tags };
}

export function sanitizeDocumentAiError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : "AI analizi başarısız.";
}
