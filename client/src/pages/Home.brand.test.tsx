// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const homeState = vi.hoisted(() => ({
  auth: { isAuthenticated: false, loading: false },
  setLocation: vi.fn(),
  startLogin: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => homeState.auth }));
vi.mock("@/const", () => ({ startLogin: homeState.startLogin }));
vi.mock("wouter", () => ({ useLocation: () => ["/", homeState.setLocation] }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    platform: {
      homeSlides: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
      overview: { useQuery: () => ({ data: { educationCategories: [{ id: 1, name: "Türkçe", level: "subject" }], content: [] }, isLoading: false, isError: false }) },
      popularEducationCategories: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
      contentByCategory: { useQuery: () => ({ data: [{ id: 7, title: "Türkçe çalışma testi", contentType: "test", summary: "Kısa test" }, { id: 8, title: "Türkçe konu dokümanı", contentType: "document", summary: "Kısa doküman" }], isLoading: false, isError: false }) },
    },
  },
}));

import Home, { buildClassAllContentUrl, classSummary } from "./Home";

describe("Home marka, mobil menü ve CTA akışı", () => {
  afterEach(() => {
    cleanup();
    homeState.auth = { isAuthenticated: false, loading: false };
    homeState.setLocation.mockReset();
    homeState.startLogin.mockReset();
  });

  it("görünür marka olarak OkulBlog kullanır ve eski marka ifadesini render etmez", () => {
    render(<Home />);

    expect(screen.getAllByText(/OkulBlog/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Pekşen Yayınları|peksen yayınları/i)).not.toBeInTheDocument();
  });

  it("mobil menüyü açar, kapatır ve oturumsuz kullanıcı CTA’sı login akışını başlatır", () => {
    render(<Home />);

    const menuButton = screen.getByRole("button", { name: "Menüyü aç" });
    fireEvent.click(menuButton);
    expect(screen.getAllByRole("button", { name: "Ana Sayfa" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("button", { name: "Giriş yap" }).length).toBeGreaterThanOrEqual(2);

    fireEvent.click(menuButton);
    expect(screen.getAllByRole("button", { name: "Ana Sayfa" })).toHaveLength(1);
    fireEvent.click(screen.getAllByRole("button", { name: "Giriş yap" })[0]);
    expect(homeState.startLogin).toHaveBeenCalledTimes(1);
  });

  it("Ders kartını seçili kategori sonuçlarına taşır ve içerik türü filtresini uygular", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: /Türkçe/ }));
    expect(screen.getByText("Seçili öğrenme yolu")).toBeInTheDocument();
    expect(screen.getByText("Türkçe çalışma testi")).toBeInTheDocument();

    const documentFilter = screen.getAllByRole("button", { name: /^Dokümanlar$/ }).at(-1);
    expect(documentFilter).toBeDefined();
    fireEvent.click(documentFilter!);
    expect(screen.getByText("Türkçe konu dokümanı")).toBeInTheDocument();
    expect(screen.queryByText("Türkçe çalışma testi")).not.toBeInTheDocument();
  });

  it("iletişim ve Soru-Cevap alanlarını ayrı sayfaya taşır; Home’da yalnızca SSS alanını gösterir", () => {
    render(<Home />);

    expect(screen.getByText("Sıkça sorulan sorular")).toBeInTheDocument();
    expect(screen.queryByText("OkulBlog ekibi burada.")).not.toBeInTheDocument();
    expect(screen.queryByText("Takıldığın yerde birlikte düşünelim.")).not.toBeInTheDocument();
  });

  it("ders ve içerik türü seçimlerini paylaşılabilir URL parametrelerine yazar", () => {
    window.history.pushState({}, "", "/");
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: /Türkçe/ }));
    expect(window.location.search).toBe("?categoryId=1");

    const documentFilter = screen.getAllByRole("button", { name: /^Dokümanlar$/ }).at(-1);
    fireEvent.click(documentFilter!);
    expect(window.location.search).toBe("?categoryId=1&contentType=document");
  });

  it("SSS aramasında sonuçları anında filtreler", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("SSS içinde ara"), { target: { value: "üyelik" } });
    expect(screen.getByText("Üyelik zorunlu mu?")).toBeInTheDocument();
    expect(screen.queryByText("Öğretmenler içerik ekleyebilir mi?")).not.toBeInTheDocument();
  });

  it("sınıf özetinde alt kategorilerdeki içerik türü sayaçlarını ve yeni içerik önizlemesini üretir", () => {
    const nodes = [
      { id: 10, name: "1. Sınıf", level: "class", parentId: null },
      { id: 11, name: "Türkçe", level: "subject", parentId: 10 },
      { id: 12, name: "Ünite 1", level: "unit", parentId: 11 },
    ];
    const summary = classSummary("1. Sınıf", nodes, [
      { id: 1, title: "Test", categoryId: 12, contentType: "test", status: "published", createdAt: "2026-08-18" },
      { id: 2, title: "Video", categoryId: 11, contentType: "video", status: "pending", createdAt: "2026-08-17" },
      { id: 3, title: "Pasif", categoryId: 12, contentType: "document", status: "draft", createdAt: "2026-08-19" },
    ]);
    expect(summary.total).toBe(2);
    expect(summary.counts.test).toBe(1);
    expect(summary.counts.video).toBe(1);
    expect(summary.previews.map(item => item.title)).toEqual(["Test", "Video"]);
  });

  it("sınıfın Tümünü Gör URL’si sınıfı ve tüm içerik modunu korur", () => {
    expect(buildClassAllContentUrl("1. Sınıf")).toBe("/icerik/test?class=1.%20S%C4%B1n%C4%B1f&contentType=all");
  });

  it("oturumlu kullanıcıya Panelim ve Panele git CTA’larını gösterip Panel’e yönlendirir", () => {
    homeState.auth = { isAuthenticated: true, loading: false };
    render(<Home />);

    expect(screen.getAllByRole("button", { name: "Panelim" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: "Panele git" }).length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getAllByRole("button", { name: "Panele git" })[0]);
    expect(homeState.setLocation).toHaveBeenCalledWith("/panel");
  });
});
