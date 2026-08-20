import { describe, expect, it } from "vitest";
import { formatAiQuotaStatus, getAiModelCapabilityLabels, removeAiDraftResult, updateAiDraftResult, type AiDraftResult } from "./aiResultManagement";

const first: AiDraftResult = {
  id: "one",
  questionType: "multiple-choice",
  prompt: "Birinci soru",
  options: ["A", "B"],
  answer: "A",
  explanation: "Açıklama",
};
const second: AiDraftResult = { ...first, id: "two", prompt: "İkinci soru" };

describe("AI result management", () => {
  it("updates only the selected draft and preserves the other results", () => {
    const result = updateAiDraftResult([first, second], "one", { prompt: "Düzenlenmiş soru" });
    expect(result[0]?.prompt).toBe("Düzenlenmiş soru");
    expect(result[1]?.prompt).toBe("İkinci soru");
  });

  it("removes an individual draft", () => {
    expect(removeAiDraftResult([first, second], "one")).toEqual([second]);
  });

  it("normalizes model capabilities and quota fallback", () => {
    expect(getAiModelCapabilityLabels({ capabilities: ["Vision", "JSON", 7] })).toEqual(["Vision", "JSON"]);
    expect(formatAiQuotaStatus("12 / 60 istek")).toBe("12 / 60 istek");
    expect(formatAiQuotaStatus(undefined)).toBe("API anahtarı sonrası görünür");
  });
});
