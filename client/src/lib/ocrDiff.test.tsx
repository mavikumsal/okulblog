import { describe, expect, it } from "vitest";
import { buildOcrDiff, countOcrDiffs } from "./ocrDiff";

describe("buildOcrDiff", () => {
  it("manuel OCR düzenlemesindeki eklenen ve çıkarılan kelimeleri ayırır", () => {
    const tokens = buildOcrDiff("Birinci soru doğru cevap", "Birinci soru yanıt cevap");
    const counts = countOcrDiffs(tokens);
    expect(counts.added).toBe(1);
    expect(counts.removed).toBe(1);
    expect(tokens.some(token => token.kind === "added" && token.text.includes("yanıt"))).toBe(true);
    expect(tokens.some(token => token.kind === "removed" && token.text.includes("doğru"))).toBe(true);
  });

  it("metin değişmediyse yalnızca aynı tokenları döndürür", () => {
    const tokens = buildOcrDiff("A B", "A B");
    expect(tokens).toEqual([{ kind: "same", text: "A B" }]);
    expect(countOcrDiffs(tokens)).toEqual({ added: 0, removed: 0 });
  });
});
