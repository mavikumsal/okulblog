import { describe, expect, it } from "vitest";
import { readQuestionUrlState } from "./Panel";

describe("Soru Havuzu URL filtre durumu", () => {
  it("geçerli filtre, sıralama ve sayfa değerlerini çözer", () => {
    expect(readQuestionUrlState("?q=kesir&qType=multiple-choice&qStatus=approved&qDifficulty=hard&qCategory=42&qSource=with-source&qSort=difficulty&qPage=3")).toEqual({
      search: "kesir",
      type: "multiple-choice",
      status: "approved",
      difficulty: "hard",
      category: "42",
      source: "with-source",
      sort: "difficulty",
      page: 3,
    });
  });

  it("tanımsız veya hatalı değerleri güvenli varsayılanlara döndürür", () => {
    expect(readQuestionUrlState("?qType=invalid&qStatus=invalid&qDifficulty=invalid&qSource=invalid&qSort=invalid&qPage=-2")).toEqual({
      search: "",
      type: "all",
      status: "all",
      difficulty: "all",
      category: "",
      source: "all",
      sort: "newest",
      page: 1,
    });
  });

  it("arama metnini uzunluk sınırında tutar ve ondalık sayfayı aşağı yuvarlar", () => {
    const longSearch = "a".repeat(220);
    const state = readQuestionUrlState(`?q=${longSearch}&qPage=2.9`);
    expect(state.search).toHaveLength(180);
    expect(state.page).toBe(2);
  });
});
