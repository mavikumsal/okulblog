import { describe, expect, it } from "vitest";
import { applyAnswerKeyToQuestions, calculateAnswerKeyQuality, type ParsedPdfQuestion } from "./pdfQuestionParser";

const question = (overrides: Partial<ParsedPdfQuestion> = {}): ParsedPdfQuestion => ({
  sourceNumber: "1",
  prompt: "Birinci soru",
  options: ["Elma", "Armut", "Muz", "Kiraz"],
  answer: null,
  questionType: "multiple-choice",
  topicTag: null,
  confidence: "medium",
  confidenceScore: 0.78,
  answerMatched: false,
  hasEmbeddedImage: false,
  embeddedImageDataBase64: null,
  embeddedImageUrl: null,
  embeddedImageRole: null,
  ocrText: "Birinci soru",
  ocrSourceText: "Birinci soru",
  page: 1,
  warning: "Cevap anahtarı bulunamadı; doğru cevabı seçin.",
  ...overrides,
});

describe("applyAnswerKeyToQuestions", () => {
  it("soru numarasını cevap harfiyle eşleştirip doğru seçenek metnini yazar", () => {
    const [result] = applyAnswerKeyToQuestions([question()], new Map([["1", "B"]]));
    expect(result.answer).toBe("Armut");
    expect(result.answerMatched).toBe(true);
    expect(result.confidence).toBe("high");
    expect(result.warning).toBeNull();
  });

  it("cevap anahtarı harfi seçeneklerle eşleşmezse manuel kontrol uyarısı üretir", () => {
    const [result] = applyAnswerKeyToQuestions([question({ options: ["A", "B"] })], new Map([["1", "D"]]));
    expect(result.answer).toBe("D");
    expect(result.answerMatched).toBe(false);
    expect(result.warning).toContain("manuel kontrol");
  });

  it("cevap anahtarında bulunmayan soruyu düşük güvenli manuel kontrole bırakır", () => {
    const [result] = applyAnswerKeyToQuestions([question()], new Map([["2", "A"]]));
    expect(result.answer).toBeNull();
    expect(result.answerMatched).toBe(false);
    expect(result.warning).toContain("manuel cevap");
  });
});


describe("calculateAnswerKeyQuality", () => {
  it("iyi çözünürlük, kontrast ve yeterli eşleşmede uygun kalite döndürür", () => {
    const result = calculateAnswerKeyQuality({ pagesAnalyzed: 2, detectedPairs: 20, hasTextLayer: true, averageContrast: 55, minWidth: 1200, minHeight: 1600 });
    expect(result.level).toBe("good");
    expect(result.warnings).toHaveLength(0);
  });

  it("taranmış veya düşük kaliteli cevap anahtarında açıklayıcı uyarılar üretir", () => {
    const result = calculateAnswerKeyQuality({ pagesAnalyzed: 1, detectedPairs: 1, hasTextLayer: false, averageContrast: 12, minWidth: 500, minHeight: 700 });
    expect(result.level).toBe("poor");
    expect(result.warnings.join(" ")).toContain("çözünürlüğü düşük");
    expect(result.warnings.join(" ")).toContain("metin katmanı");
    expect(result.warnings.join(" ")).toContain("üç güvenilir");
  });
});


describe("answer-key format warnings", () => {
  it("sıra boşluğu ve geçersiz cevap işaretlerini bildirir", () => {
    const result = calculateAnswerKeyQuality({ pagesAnalyzed: 1, detectedPairs: 8, hasTextLayer: true, averageContrast: 40, minWidth: 1000, minHeight: 1400, sequenceGaps: 2, invalidAnswerMarkers: 1 });
    expect(result.sequenceGaps).toBe(2);
    expect(result.invalidAnswerMarkers).toBe(1);
    expect(result.warnings.join(" ")).toContain("soru numarası sırası");
    expect(result.warnings.join(" ")).toContain("A–D dışı");
  });
});
