import { describe, expect, it } from "vitest";
import { buildDocumentAiPrompt, normalizeDocumentAiMetadata, sanitizeDocumentAiError, shouldAnalyzeDocumentText } from "./documentAiMetadata";

describe("Doküman AI metadata güvenlik akışı", () => {
  it("AI analizini yalnızca kullanıcı onayı ve yeterli metin varsa çalıştırır", () => {
    expect(shouldAnalyzeDocumentText(false, "Bu metin yeterince uzun olsa bile analiz kapalı." )).toBe(false);
    expect(shouldAnalyzeDocumentText(true, "kısa")).toBe(false);
    expect(shouldAnalyzeDocumentText(true, "Türkçe eğitim dokümanı için yeterli uzunlukta örnek metin burada bulunuyor.")).toBe(true);
  });

  it("AI prompt metnini 12.000 karakterle sınırlar", () => {
    const prompt = buildDocumentAiPrompt("x".repeat(20_000));
    expect(prompt.length).toBeLessThan(20_200);
    expect(prompt.endsWith("x".repeat(12_000))).toBe(true);
  });

  it("AI çıktısını başlık, özet ve etiket sınırlarına normalize eder", () => {
    const result = normalizeDocumentAiMetadata({ title: "  Başlık  ", summary: "  Özet  ", tags: ["Türkçe", "", "Matematik", "Fen", "Sosyal", "İngilizce", "Fazla"] }, "Dosya");
    expect(result).toEqual({ title: "Başlık", summary: "Özet", tags: ["Türkçe", "Matematik", "Fen", "Sosyal", "İngilizce", "Fazla"] });
  });

  it("AI hata ayrıntısını güvenli uzunlukta döndürür", () => {
    expect(sanitizeDocumentAiError(new Error("x".repeat(800)))).toHaveLength(500);
    expect(sanitizeDocumentAiError("bilinmeyen")).toBe("AI analizi başarısız.");
  });
});
