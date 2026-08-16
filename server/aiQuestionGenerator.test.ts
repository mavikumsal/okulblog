import { describe, expect, it } from "vitest";
import { generatedQuestionSchema } from "./aiQuestionGenerator";

describe("generatedQuestionSchema", () => {
  it("geçerli çoktan seçmeli AI taslağını kabul eder", () => {
    const result = generatedQuestionSchema.parse({
      questionType: "multiple-choice",
      prompt: "Aşağıdaki sözcüklerden hangisi hece sayısı bakımından diğerlerinden farklıdır?",
      options: ["Kalem", "Kitap", "Araba", "Silgi"],
      answer: "Araba",
      explanation: "Araba üç hecelidir; diğer seçenekler iki hecelidir.",
    });

    expect(result.options).toHaveLength(4);
    expect(result.questionType).toBe("multiple-choice");
  });

  it("şema dışı veya eksik çıktıyı reddeder", () => {
    expect(() => generatedQuestionSchema.parse({
      questionType: "multiple-choice",
      prompt: "Kısa",
      options: [],
      answer: "A",
    })).toThrow();
  });
});
