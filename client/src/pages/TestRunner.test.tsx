import { describe, expect, it } from "vitest";
import { calculateTestResult } from "./TestRunner";

describe("online test sonucu analizi", () => {
  it("doğru, yanlış, boş ve yüzde puanı hesaplar", () => {
    expect(calculateTestResult([
      { id: 1, answer: "A" },
      { id: 2, answer: "B" },
      { id: 3, answer: "C" },
      { id: 4, answer: "D" },
    ], { 1: "A", 2: "D", 4: "D" })).toEqual({ correct: 2, wrong: 1, blank: 1, score: 50 });
  });

  it("soru yokken sıfır sonuç döndürür", () => {
    expect(calculateTestResult([], {})).toEqual({ correct: 0, wrong: 0, blank: 0, score: 0 });
  });
});
