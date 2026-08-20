import { describe, expect, it } from "vitest";
import { describeCoverReplacement, getStableDocumentCoverKey, safeDocumentCoverStem } from "./documentCoverLifecycle";

describe("document cover lifecycle", () => {
  it("creates a stable sanitized cover key", () => {
    expect(safeDocumentCoverStem("2. sınıf matematik / çalışma.pdf")).toBe("2.-s-n-f-matematik----al--ma");
    expect(getStableDocumentCoverKey(1, "2. sınıf matematik / çalışma.pdf")).toBe("okulblog/imported/1/previews/2.-s-n-f-matematik----al--ma-cover.webp");
  });

  it("marks a previous different cover as archived", () => {
    expect(describeCoverReplacement("/manus-storage/old-cover.webp", "/manus-storage/stable-cover.webp")).toEqual({
      previousCoverImageUrl: "/manus-storage/old-cover.webp",
      coverImageUrl: "/manus-storage/stable-cover.webp",
      archived: true,
    });
  });

  it("does not mark the same stable cover as archived", () => {
    expect(describeCoverReplacement("/manus-storage/stable-cover.webp", "/manus-storage/stable-cover.webp").archived).toBe(false);
  });
});
