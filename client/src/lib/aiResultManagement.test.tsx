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

import { selectAiDraftResults, validateAiDraftResultsForBulkSave } from "./aiResultManagement";

const coordinateQuestion: AiDraftResult = {
  ...first,
  prompt: "Türkiye'nin başkenti aşağıdakilerden hangisidir?",
  options: ["Ankara", "İstanbul", "İzmir", "Bursa"],
  sourceFileName: "kaynak.pdf",
  sourcePage: 3,
  sourceRegion: { page: 3, x: 40, y: 120, width: 420, height: 180, pageWidth: 595, pageHeight: 842, coordinateSpace: "pdf-points" },
};

describe("AI bulk question management", () => {
  it("selects only the requested draft results", () => {
    expect(selectAiDraftResults([coordinateQuestion, { ...coordinateQuestion, id: "q-2" }], ["q-2"])).toEqual([{ ...coordinateQuestion, id: "q-2" }]);
  });

  it("accepts a valid question carrying OCR source coordinates", () => {
    expect(validateAiDraftResultsForBulkSave([coordinateQuestion])).toEqual({ valid: true, invalidId: null });
  });

  it("rejects short prompts and multiple-choice questions without enough options", () => {
    const invalid = { ...coordinateQuestion, id: "bad", prompt: "Kısa", options: ["Tek seçenek"] };
    expect(validateAiDraftResultsForBulkSave([invalid])).toEqual({ valid: false, invalidId: "bad" });
  });
});
