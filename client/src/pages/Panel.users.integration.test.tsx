// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mutate, invalidate, toastSuccess } = vi.hoisted(() => ({ mutate: vi.fn(), invalidate: vi.fn(), toastSuccess: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "admin", name: "Admin" } }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/panel/uyeler", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: vi.fn() } }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

const trpcMock = vi.hoisted(() => {
  const queryResult = (data: unknown) => ({ data, isLoading: false, isError: false });
  const hook = (data: unknown = []) => ({ useQuery: () => queryResult(data), useMutation: (options?: { onSuccess?: () => void; onError?: () => void }) => ({ isPending: false, mutate: (input: unknown, callbacks?: { onSettled?: () => void }) => { mutate(input); options?.onSuccess?.(); callbacks?.onSettled?.(); } }) });
  return {
  useUtils: () => new Proxy({}, { get: (_target, property) => property === "admin" ? { users: { invalidate } } : new Proxy({}, { get: () => ({ invalidate }) }) }),
  panel: { accessibleSections: hook(["Üye Yönetimi"]) },
  platform: { overview: hook({ content: [], educationCategories: [] }) },
  permissions: { forRole: hook([]), update: hook() },
  categories: { list: hook([]), create: hook(), setInstitutionStatus: hook(), update: hook(), setStatus: hook() },
  questions: { list: hook([]), create: hook() },
  ai: { generateQuestion: hook() },
  contents: { list: hook([]), create: hook(), archive: hook() },
  admin: { users: hook([{ id: 7, name: "Ayşe Öğrenci", email: "ayse@example.com", role: "member", lastSignedIn: new Date() }]), updateUserRole: hook(), settings: hook([]), saveSetting: hook(), newsCategories: hook([]), createNewsCategory: hook(), homeSlides: hook([]), createHomeSlide: hook(), updateHomeSlide: hook(), deleteHomeSlide: hook(), popularEducationCategories: hook([]), savePopularEducationCategories: hook() },
    security: { list: hook([]) },
  };
});
vi.mock("@/lib/trpc", () => ({ trpc: trpcMock }));

import Panel from "./Panel";

describe("Panel Üye Yönetimi entegrasyonu", () => {
  beforeEach(() => { mutate.mockClear(); invalidate.mockClear(); toastSuccess.mockClear(); });
  afterEach(() => cleanup());

  it("gerçek Panel ekranında rol mutation’ını, yenilemeyi, toast’ı ve güncel değeri doğrular", async () => {
    render(<Panel />);
    expect(screen.getByText("Üye Yönetimi")).toBeInTheDocument();
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "teacher" } });
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ id: 7, role: "teacher" }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Kullanıcı rolü güncellendi."));
    expect(invalidate).toHaveBeenCalled();
    expect(select).toHaveValue("teacher");
  });
});
