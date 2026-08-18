import { describe, expect, it } from "vitest";
import { buildClassPreviewData } from "./LatestPreview";

const categories = [
  { id: 1, name: "1. Sınıf", level: "class", parentId: null, isActive: true, categoryType: "education", sortOrder: 1 },
  { id: 2, name: "Türkçe", level: "subject", parentId: 1, isActive: true, categoryType: "education", sortOrder: 1 },
  { id: 3, name: "Matematik", level: "subject", parentId: 1, isActive: true, categoryType: "education", sortOrder: 2 },
  { id: 4, name: "1. Ünite", level: "unit", parentId: 2, isActive: true, categoryType: "education", sortOrder: 1 },
];

const content = [
  { id: 10, title: "Türkçe Video", contentType: "video", categoryId: 4, status: "published", createdAt: "2026-08-18T10:00:00.000Z" },
  { id: 11, title: "Türkçe Test", contentType: "test", categoryId: 2, status: "published", createdAt: "2026-08-17T10:00:00.000Z" },
  { id: 12, title: "Taslak içerik", contentType: "document", categoryId: 2, status: "draft", createdAt: "2026-08-19T10:00:00.000Z" },
];

describe("LatestPreview gerçek veri yardımcıları", () => {
  it("sınıf alt ağacındaki yayınlanmış içeriklerden ders ve yeni içerik üretir", () => {
    const result = buildClassPreviewData(categories, content, "1. Sınıf");
    expect(result.popularSubjects.map(subject => subject.name)).toEqual(["Türkçe"]);
    expect(result.popularSubjects[0]?.contentCount).toBe(2);
    expect(result.recentContent.map(item => item.title)).toEqual(["Türkçe Video", "Türkçe Test"]);
    expect(result.published.every(item => item.status === "published")).toBe(true);
  });

  it("sınıf bulunamadığında ve yayınlanmış içerik olmadığında boş sonuç döndürür", () => {
    expect(buildClassPreviewData(categories, [], "5. Sınıf")).toEqual({ popularSubjects: [], recentContent: [], published: [] });
  });
});
