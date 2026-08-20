import { describe, expect, it } from "vitest";
import { filterIndexingQueueRows, getSnippetStatus } from "./SeoAdminTools";

describe("SEO admin tools", () => {
  it("snippet sınırını doğru raporlar", () => {
    expect(getSnippetStatus("başlık", 10)).toEqual({ length: 6, over: false });
    expect(getSnippetStatus("çok uzun başlık", 5).over).toBe(true);
  });

  it("indeksleme kuyruğunu durumuna göre filtreler", () => {
    const rows = [{ status: "pending" }, { status: "failed" }, { status: "submitted" }];
    expect(filterIndexingQueueRows(rows, "failed")).toEqual([{ status: "failed" }]);
    expect(filterIndexingQueueRows(rows, "all")).toHaveLength(3);
  });
});
