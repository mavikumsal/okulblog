import { describe, expect, it } from "vitest";
import { buildCurriculumExampleDocument, buildCurriculumExampleQuestion } from "./db";

describe("kazanım örnek içerik üretimi", () => {
  const outcome = { id: 42, name: "Harfleri tanır ve sesleri ayırt eder." };

  it("kazanıma bağlı çoktan seçmeli soru üretir", () => {
    const question = buildCurriculumExampleQuestion(outcome, "1. Sınıf");
    expect(question.questionType).toBe("multiple-choice");
    expect(question.options).toHaveLength(4);
    expect(question.answer).toBe(outcome.name);
    expect(question.categoryId).toBeUndefined();
    expect(question.gradeLevel).toBe("1. Sınıf");
  });

  it("kazanıma bağlı çalışma dokümanı üretir", () => {
    const document = buildCurriculumExampleDocument(outcome, "1. Sınıf", "Türkçe", "Okuma-Yazmaya Giriş");
    expect(document.contentType).toBe("document");
    expect(document.title).toContain(outcome.name);
    expect(document.summary).toContain("Türkçe");
    expect(document.body).toContain("## Hedef");
  });
});
