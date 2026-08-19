import { describe, expect, it } from "vitest";
import { summarizeDocumentAiUsage } from "./db";

describe("Doküman AI ve OCR kullanım özeti", () => {
  it("AI analiz ve OCR durumlarını doğru toplar", () => {
    const result = summarizeDocumentAiUsage([
      { aiStatus: "completed", ocrStatus: "completed", ocrConfidence: 84 },
      { aiStatus: "failed", ocrStatus: "failed", ocrConfidence: null },
      { aiStatus: "not_started", ocrStatus: "not_needed", ocrConfidence: null },
      { aiStatus: "processing", ocrStatus: "completed", ocrConfidence: 92 },
    ]);

    expect(result.totalDrafts).toBe(4);
    expect(result.aiAnalyzed).toBe(3);
    expect(result.aiCompleted).toBe(1);
    expect(result.aiFailed).toBe(1);
    expect(result.ocrAttempted).toBe(3);
    expect(result.ocrCompleted).toBe(2);
    expect(result.ocrFailed).toBe(1);
    expect(result.ocrSuccessRate).toBe(67);
    expect(result.averageOcrConfidence).toBe(88);
    expect(result.costTracked).toBe(false);
    expect(result.estimatedCostUsd).toBeNull();
  });

  it("OCR kaydı yokken oranı sıfır ve güveni boş döndürür", () => {
    expect(summarizeDocumentAiUsage([{ aiStatus: "not_started", ocrStatus: "not_needed", ocrConfidence: null }])).toMatchObject({
      ocrAttempted: 0,
      ocrSuccessRate: 0,
      averageOcrConfidence: null,
    });
  });
});
