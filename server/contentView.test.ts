import { describe, expect, it } from "vitest";
import { normalizeContentIds, normalizeViewDay } from "./db";

describe("content view contracts", () => {
  it("normalizes view days in UTC YYYY-MM-DD format", () => {
    expect(normalizeViewDay(new Date("2026-08-19T23:59:59.000Z"))).toBe("2026-08-19");
  });

  it("deduplicates, removes invalid ids and limits bulk cover selections", () => {
    const ids = normalizeContentIds([3, 3, 0, -1, 2.5, 7]);
    expect(ids).toEqual([3, 7]);
    expect(normalizeContentIds(Array.from({ length: 105 }, (_, index) => index + 1))).toHaveLength(100);
  });
});
