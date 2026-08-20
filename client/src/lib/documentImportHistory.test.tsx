import { describe, expect, it } from "vitest";
import { filterDocumentImportHistory } from "./documentImportHistory";

describe("filterDocumentImportHistory", () => {
  const now = new Date("2026-08-20T12:00:00Z").getTime();
  const entries = [
    { id: 1, status: "failed", provider: "bunny-storage", createdAt: "2026-08-20T10:00:00Z" },
    { id: 2, status: "completed", provider: "s3", createdAt: "2026-08-15T10:00:00Z" },
    { id: 3, status: "failed", provider: "s3", createdAt: "2026-07-01T10:00:00Z" },
    { id: 4, status: "completed", provider: "s3", createdAt: "invalid" },
  ];

  it("durum ve depolama sağlayıcısını birlikte filtreler", () => {
    expect(filterDocumentImportHistory(entries, { status: "failed", provider: "bunny-storage", dateRange: "all", now }).map(entry => entry.id)).toEqual([1]);
  });

  it("tarih aralıklarını now değerine göre uygular", () => {
    expect(filterDocumentImportHistory(entries, { status: "all", provider: "all", dateRange: "week", now }).map(entry => entry.id)).toEqual([1, 2]);
  });

  it("geçersiz tarihli kayıtları tarih filtresinde dışarıda bırakır", () => {
    expect(filterDocumentImportHistory(entries, { status: "all", provider: "all", dateRange: "month", now }).map(entry => entry.id)).toEqual([1, 2]);
  });
});
