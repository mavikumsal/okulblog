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
      overview: { useQuery: () => ({ data: { educationCategories: [], content: [] }, isLoading: false, isError: false }) },
      popularEducationCategories: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
      contentByCategory: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
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

  it("oturumlu kullanıcıya Panelim ve Panele git CTA’larını gösterip Panel’e yönlendirir", () => {
    homeState.auth = { isAuthenticated: true, loading: false };
    render(<Home />);

    expect(screen.getAllByRole("button", { name: "Panelim" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: "Panele git" }).length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getAllByRole("button", { name: "Panele git" })[0]);
    expect(homeState.setLocation).toHaveBeenCalledWith("/panel");
  });
});
