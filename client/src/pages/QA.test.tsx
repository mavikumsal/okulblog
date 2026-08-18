// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const qaState = vi.hoisted(() => ({ setLocation: vi.fn(), startLogin: vi.fn(), isAuthenticated: false }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: qaState.isAuthenticated, loading: false }) }));
vi.mock("@/const", () => ({ startLogin: qaState.startLogin }));
vi.mock("wouter", () => ({ useLocation: () => ["/soru-cevap", qaState.setLocation] }));
vi.mock("@/components/RichTextEditor", () => ({ default: ({ label }: { label: string }) => <div>{label}</div> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    platform: {
      qa: {
        categories: { useQuery: () => ({ data: { education: [{ id: 1, name: "İlkokul", level: "ana-grup", parentId: null }, { id: 2, name: "İlkokul", level: "school-level", parentId: 1 }, { id: 3, name: "1. Sınıf", level: "class", parentId: 2 }] }, isLoading: false }) },
        list: { useQuery: () => ({ data: { questions: [], answers: [] }, isLoading: false, refetch: vi.fn() }) },
      },
      siteContact: { useQuery: () => ({ data: { contact_email: "destek@example.com" } }) },
    },
    member: {
      uploadQaImage: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      askQuestion: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      answerQuestion: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

import QA from "./QA";

describe("Soru-Cevap sayfası", () => {
  afterEach(() => { cleanup(); qaState.setLocation.mockReset(); qaState.startLogin.mockReset(); qaState.isAuthenticated = false; window.history.replaceState(null, "", "/soru-cevap"); });

  it("istenen üst navigasyonu ve ayrı iletişim alanını gösterir", () => {
    render(<QA />);
    expect(screen.getByRole("heading", { name: "Soru-Cevap" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Testler" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "İletişim" })).not.toBeInTheDocument();
    expect(screen.getByText("OkulBlog ekibi burada.")).toBeInTheDocument();
  });

  it("giriş yapan kullanıcıya görsel eklemeli Soru Sor modalı sunar", () => {
    qaState.isAuthenticated = true;
    render(<QA />);
    fireEvent.click(screen.getByRole("button", { name: "Soru Sor" }));
    expect(screen.getByRole("dialog", { name: "Soru Sor" })).toBeInTheDocument();
    expect(screen.getByText("Görsel ekle")).toBeInTheDocument();
    expect(screen.getByLabelText("Soru başlığı")).toBeInTheDocument();
  });

  it("arama ve kategori seçimini kullanıcıya sunar ve URL'yi günceller", () => {
    render(<QA />);
    fireEvent.change(screen.getByPlaceholderText("Sorularda ara..."), { target: { value: "matematik" } });
    expect(screen.getByDisplayValue("matematik")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filtre Ana grup" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Filtre Ana grup" }), { target: { value: "1" } });
    expect(screen.getByRole("combobox", { name: "Filtre Okul düzeyi" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Filtre Okul düzeyi" }), { target: { value: "2" } });
    const classSelect = screen.getByRole("combobox", { name: "Filtre Sınıf" });
    expect(classSelect).toBeInTheDocument();
    fireEvent.change(classSelect, { target: { value: "3" } });
    expect(window.location.search).toContain("classId=3");
  });
});
