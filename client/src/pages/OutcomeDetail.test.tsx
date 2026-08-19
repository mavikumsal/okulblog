import { describe, expect, it } from "vitest";
import { getImmediateFeedback, normalizeQuestionOptions } from "./OutcomeDetail";

describe("OutcomeDetail soru çözme yardımcıları", () => {
  const question = { id: 1, prompt: "2 + 2 kaçtır?", options: ["3", "4", "5"], answer: "4" };

  it("seçenekleri güvenli biçimde normalize eder", () => {
    expect(normalizeQuestionOptions(question)).toEqual(["3", "4", "5"]);
    expect(normalizeQuestionOptions({ ...question, options: null })).toEqual([]);
  });

  it("seçilen cevaba anında doğru/yanlış sonucu verir", () => {
    expect(getImmediateFeedback(question, "4")).toBe(true);
    expect(getImmediateFeedback(question, "5")).toBe(false);
  });
});
