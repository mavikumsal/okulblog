// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  result: {
    data: {
      scope: "mine" as const,
      total: 12,
      recentCount: 4,
      statuses: { draft: 3, approved: 8, archived: 1 },
      difficulties: { easy: 5, medium: 4, hard: 3 },
      questionTypes: { "multiple-choice": 8, "true-false": 2, "open-ended": 2 },
      recentQuestions: [],
    },
    isLoading: false,
    isError: false,
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: { panel: { productionStats: { useQuery: () => state.result } } },
}));

import { QuestionProductionDashboard } from "./QuestionProductionDashboard";

describe("QuestionProductionDashboard", () => {
  afterEach(() => cleanup());

  it("üretim kapsamını ve temel istatistikleri gösterir", () => {
    render(<QuestionProductionDashboard />);
    expect(screen.getByText("Soru üretim istatistikleri")).toBeInTheDocument();
    expect(screen.getByText("Kendi soru üretimleriniz · Son 30 gün")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Son 30 gün")).toBeInTheDocument();
    expect(screen.getByText("Zorluk dağılımı")).toBeInTheDocument();
  });

  it("soru bulunmadığında açıklayıcı boş durum gösterir", () => {
    state.result = { ...state.result, data: { ...state.result.data, total: 0, recentCount: 0 } };
    render(<QuestionProductionDashboard compact />);
    expect(screen.getByText("Henüz soru üretimi yok.")).toBeInTheDocument();
  });
});
