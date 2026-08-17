// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: false, loading: false }) }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("wouter", () => ({ useLocation: () => ["/", vi.fn()] }));
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

describe("Home marka nötrleştirmesi", () => {
  afterEach(() => cleanup());

  it("görünür marka olarak OkulBlog kullanır ve eski marka ifadesini render etmez", () => {
    render(<Home />);

    expect(screen.getAllByText(/OkulBlog/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Pekşen Yayınları|peksen yayınları/i)).not.toBeInTheDocument();
  });
});
