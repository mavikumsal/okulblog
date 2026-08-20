import { describe, expect, it } from "vitest";
import { getDraftTitleSaveState } from "./draftTitleSave";

describe("getDraftTitleSaveState", () => {
  it("trims a changed title and enables saving", () => {
    expect(getDraftTitleSaveState("  Yeni başlık  ", "Eski başlık")).toEqual({
      title: "Yeni başlık",
      canSave: true,
    });
  });

  it("disables saving for empty or unchanged titles", () => {
    expect(getDraftTitleSaveState("   ", "Eski başlık").canSave).toBe(false);
    expect(getDraftTitleSaveState("Eski başlık", "Eski başlık").canSave).toBe(false);
  });
});
