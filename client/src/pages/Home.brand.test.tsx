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

import Home from "./Home";

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
    expect(screen.getAllByRole("button", { name: "İçerikler" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("button", { name: "Giriş yap" }).length).toBeGreaterThanOrEqual(2);

    fireEvent.click(menuButton);
    expect(screen.getAllByRole("button", { name: "İçerikler" })).toHaveLength(1);
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

  it("iletişim formunu ve SSS alanını ana sayfada gösterir", () => {
    render(<Home />);

    expect(screen.getByText("Sıkça sorulan sorular")).toBeInTheDocument();
    expect(screen.getByLabelText("Adınız")).toBeInTheDocument();
    expect(screen.getAllByLabelText("E-posta").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText("Mesajınız")).toBeInTheDocument();
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

  it("iletişim formunda doğrulama uyarısı ve başarılı gönderim bildirimi gösterir", () => {
    render(<Home />);

    fireEvent.submit(screen.getByLabelText("Adınız").closest("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent("Lütfen formdaki alanları kontrol edin.");

    fireEvent.change(screen.getByLabelText("Adınız"), { target: { value: "Ayşe Öğretmen" } });
    fireEvent.change(screen.getAllByLabelText("E-posta")[0], { target: { value: "ayse@example.com" } });
    fireEvent.change(screen.getByLabelText("Mesajınız"), { target: { value: "Bilgi almak istiyorum." } });
    fireEvent.submit(screen.getByLabelText("Adınız").closest("form")!);
    expect(screen.getByText(/Mesajınız için teşekkürler/)).toBeInTheDocument();
  });

  it("SSS aramasında sonuçları anında filtreler", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("SSS içinde ara"), { target: { value: "üyelik" } });
    expect(screen.getByText("Üyelik zorunlu mu?")).toBeInTheDocument();
    expect(screen.queryByText("Öğretmenler içerik ekleyebilir mi?")).not.toBeInTheDocument();
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
