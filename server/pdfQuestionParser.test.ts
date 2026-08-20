import { describe, expect, it } from "vitest";
import { applyAnswerKeyToQuestions, type ParsedPdfQuestion } from "./pdfQuestionParser";

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
