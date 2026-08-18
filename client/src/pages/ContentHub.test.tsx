import { describe, expect, it } from "vitest";
import { categoryIdsForSelection, contentTypes, filterContentByClass, getTypeFromPath, paginateItems } from "./ContentHub";
import { categoryBreadcrumb, contentActionLabel, isProgressCompleted } from "./ContentDetail";

type Node = {
  id: number;
  name: string;
  level: string;
  parentId: number | null;
  categoryType: string;
  isActive: boolean;
};

const nodes: Node[] = [
  { id: 1, name: "İlkokul", level: "ana-grup", parentId: null, categoryType: "education", isActive: true },
  { id: 2, name: "1. Sınıf", level: "class", parentId: 1, categoryType: "education", isActive: true },
  { id: 3, name: "Türkçe", level: "subject", parentId: 2, categoryType: "education", isActive: true },
  { id: 4, name: "Okuma", level: "unit", parentId: 3, categoryType: "education", isActive: true },
  { id: 5, name: "Sesleri tanır", level: "outcome", parentId: 4, categoryType: "education", isActive: true },
  { id: 6, name: "Pasif", level: "unit", parentId: 3, categoryType: "education", isActive: false },
];

describe("ContentHub public kategori akışı", () => {
  it("tüm içerik türü rotalarını tanır ve geçersiz türü testlere döndürür", () => {
    expect(Object.keys(contentTypes)).toEqual(["test", "document", "video", "game", "simulation", "news"]);
    expect(getTypeFromPath("/icerik/news")).toBe("news");
    expect(getTypeFromPath("/icerik/unknown")).toBe("test");
  });

  it("seçilen üst kategorinin altındaki tüm içerik kategori kimliklerini kapsar", () => {
    expect(Array.from(categoryIdsForSelection(nodes.filter(node => node.isActive), 3)!)).toEqual([3, 4, 5]);
    expect(Array.from(categoryIdsForSelection(nodes.filter(node => node.isActive), 5)!)).toEqual([5]);
    expect(categoryIdsForSelection(nodes, null)).toBeNull();
  });

  it("Ana sayfadaki sınıf seçimi public içerik listesini sınıf alt ağacına daraltır", () => {
    const items = [{ id: 1, categoryId: 2 }, { id: 2, categoryId: 3 }, { id: 3, categoryId: 99 }];
    expect(filterContentByClass(items, nodes, "1. Sınıf").map(item => item.id)).toEqual([1, 2]);
    expect(filterContentByClass(items, nodes, null)).toEqual(items);
  });

  it("Haberler için sayfa numarasını güvenli biçimde sınırlar ve kayıtları böler", () => {
    const result = paginateItems(Array.from({ length: 13 }, (_, index) => index + 1), 3, 6);
    expect(result.currentPage).toBe(3);
    expect(result.totalPages).toBe(3);
    expect(result.items).toEqual([13]);
    expect(paginateItems([1, 2], 0, 6).currentPage).toBe(1);
  });

  it("detay sayfası için Admin kategori yolunu kökten kazanıma kadar üretir", () => {
    expect(categoryBreadcrumb(5, nodes.filter(node => node.isActive)).map(node => node.name)).toEqual(["İlkokul", "1. Sınıf", "Türkçe", "Okuma", "Sesleri tanır"]);
    expect(categoryBreadcrumb(6, nodes.filter(node => node.isActive))).toEqual([]);
  });

  it("içerik türüne göre detay aksiyon etiketini üretir", () => {
    expect(contentActionLabel("test")).toBe("Testi çöz");
    expect(contentActionLabel("video")).toBe("Videoyu izle");
    expect(contentActionLabel("document")).toBe("Dokümanı indir");
    expect(contentActionLabel("news")).toBe("Haberi oku");
  });

  it("tamamlanma durumunu içerik türü ve kimliğine göre bulur", () => {
    const progress = [{ contentType: "document", contentId: 12, status: "completed" }, { contentType: "video", contentId: 12, status: "started" }];
    expect(isProgressCompleted(progress, "document", 12)).toBe(true);
    expect(isProgressCompleted(progress, "video", 12)).toBe(false);
    expect(isProgressCompleted(progress, "document", 99)).toBe(false);
  });
});
