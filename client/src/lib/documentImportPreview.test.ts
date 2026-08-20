import { describe, expect, it } from "vitest";
import { getDocumentAiStatusLabel, getDocumentPreviewTags } from "./documentImportPreview";

describe("document import preview helpers", () => {
  it("normalizes valid tags and ignores invalid values", () => {
    expect(getDocumentPreviewTags(["  matematik ", "", 12, "Türkçe", null])).toEqual(["matematik", "Türkçe"]);
  });

  it("maps AI statuses to Turkish UI labels", () => {
    expect(getDocumentAiStatusLabel("completed")).toBe("Tamamlandı");
    expect(getDocumentAiStatusLabel("failed")).toBe("Başarısız");
    expect(getDocumentAiStatusLabel("processing")).toBe("İşleniyor");
    expect(getDocumentAiStatusLabel("not_started")).toBe("Bekliyor");
  });
});
