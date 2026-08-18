import { describe, expect, it } from "vitest";
import { educationCurriculum } from "./educationCurriculum";

describe("MEB K-12 eğitim müfredatı", () => {
  it("36 kalıcı ders-ünite-kazanım kaydı içerir", () => {
    expect(educationCurriculum).toHaveLength(36);
    expect(new Set(educationCurriculum.map(entry => entry.schoolLevel))).toEqual(
      new Set(["İlkokul", "Ortaokul", "Lise"]),
    );
    expect(new Set(educationCurriculum.map(entry => entry.className))).toHaveLength(12);
  });

  it("her kayıt gerekli kategori seviyelerini doldurur", () => {
    for (const entry of educationCurriculum) {
      expect(entry.subject.trim()).not.toBe("");
      expect(entry.unit.trim()).not.toBe("");
      expect(entry.outcome.trim()).not.toBe("");
    }
  });
});
