// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { panelState, hook } = vi.hoisted(() => {
  const state = { route: "/panel/ayarlar", testList: [] as unknown[] };
  const makeQuery = (data: unknown, extra: Record<string, unknown> = {}) => ({ data, isLoading: false, isError: false, ...extra });
  const makeHook = (data: unknown = []) => ({ useQuery: () => makeQuery(typeof data === "function" ? data() : data), useMutation: () => ({ isPending: false, mutate: vi.fn() }) });
  return { panelState: state, hook: makeHook };
});

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "admin", name: "Admin" } }) }));
vi.mock("wouter", () => ({ useLocation: () => [panelState.route, vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => new Proxy({}, { get: () => new Proxy({}, { get: () => ({ invalidate: vi.fn() }) }) }),
    panel: { accessibleSections: hook(["Ayarlar", "Testler"]) },
    platform: { overview: hook({ content: [], educationCategories: [] }) },
    permissions: { forRole: hook([]), update: hook() },
    categories: { list: hook([]), create: hook(), setInstitutionStatus: hook(), update: hook(), setStatus: hook() },
    questions: { list: hook([]), create: hook() },
    ai: { generateQuestion: hook() },
    contents: { list: hook([]), create: hook(), archive: hook() },
    tests: { list: hook(() => panelState.testList), create: hook() },
    admin: { users: hook([]), updateUserRole: hook(), settings: hook([{ settingKey: "seo_description", settingValue: "OkulBlog eğitim platformu" }]), saveSetting: hook(), newsCategories: hook([]), createNewsCategory: hook(), homeSlides: hook([]), createHomeSlide: hook(), updateHomeSlide: hook(), deleteHomeSlide: hook(), popularEducationCategories: hook({ selectedIds: [], available: [] }), savePopularEducationCategories: hook() },
    security: { list: hook([]) },
  },
}));

import Panel from "./Panel";

describe("Panel Admin modülleri component akışları", () => {
  afterEach(() => cleanup());

  it("ayarlar görünümünde izin, SEO, Search Console, reklam ve site haritası alanlarını gösterir", () => {
    panelState.route = "/panel/ayarlar";
    render(<Panel />);
    expect(screen.getByText("Panel izinleri")).toBeInTheDocument();
    expect(screen.getByText("SEO ve Google Search Console")).toBeInTheDocument();
    expect(screen.getByText("Reklam Alanı")).toBeInTheDocument();
    expect(screen.getByText("Site haritası önizlemesi")).toBeInTheDocument();
  });

  it("güvenlik ve istatistik ekranlarının boş durumlarını gösterir", () => {
    panelState.route = "/panel/guvenlik";
    const { unmount } = render(<Panel />);
    expect(screen.getByText("Güvenlik Olayları")).toBeInTheDocument();
    expect(screen.getByText("Henüz kayıtlı güvenlik olayı yok.")).toBeInTheDocument();
    unmount();

    panelState.route = "/panel/istatistikler";
    render(<Panel />);
    expect(screen.getByText("Kayıtlı üye")).toBeInTheDocument();
    expect(screen.getByText("Güvenlik kaydı")).toBeInTheDocument();
  });

  it("Testler ekranında gerçek test metadata’sını listede gösterir", () => {
    panelState.route = "/panel/testler";
    panelState.testList = [{ id: 9, title: "Türkçe kazanım testi", description: "İlk deneme", questionIds: [1, 2, 3], status: "draft" }];
    render(<Panel />);
    expect(screen.getByText("Oluşturulan testler")).toBeInTheDocument();
    expect(screen.getByText("Türkçe kazanım testi")).toBeInTheDocument();
    expect(screen.getByText(/İlk deneme · 3 soru/)).toBeInTheDocument();
  });
});
