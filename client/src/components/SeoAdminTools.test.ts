import { describe, expect, it } from "vitest";
import { filterIndexingQueueRows, generateOgImageDataUrl, getSnippetStatus } from "./SeoAdminTools";
import { getSeoQueueSummary } from "./AdminOverviewDashboard";

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

  it("ogImage üreticisi SVG data URL ve güvenli kaçış üretir", () => {
    const image = generateOgImageDataUrl("Matematik <test>", "2. Sınıf");
    expect(image.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(image.split(",")[1])).toContain("Matematik &lt;test&gt;");
    expect(decodeURIComponent(image.split(",")[1])).toContain("2. Sınıf");
  });

  it("dashboard SEO özetini doğru hesaplar", () => {
    expect(getSeoQueueSummary([{ status: "pending" }, { status: "submitted" }, { status: "submitted" }, { status: "failed" }, { status: "skipped" }])).toEqual({ pending: 1, submitted: 2, failed: 1, skipped: 1 });
  });
});
