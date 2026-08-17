// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ loading: false, user: { role: "admin", name: "Admin" }, logout: vi.fn() }),
}));
vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => false }));
vi.mock("wouter", () => ({ useLocation: () => ["/panel", vi.fn()] }));
vi.mock("@/lib/trpc", () => ({
  trpc: { panel: { accessibleSections: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } } },
}));

import DashboardLayout from "./DashboardLayout";

describe("DashboardLayout nötr hesap etiketi", () => {
  afterEach(() => cleanup());

  it("profil alanında OkulBlog hesabını gösterir ve eski marka adını göstermez", () => {
    render(<DashboardLayout><div>Panel içeriği</div></DashboardLayout>);

    expect(screen.getByText("OkulBlog hesabı")).toBeInTheDocument();
    expect(screen.getByText("Hesap seçenekleri")).toBeInTheDocument();
    expect(screen.queryByText(/Pekşen Yayınları|peksen yayınları/i)).not.toBeInTheDocument();
  });
});
