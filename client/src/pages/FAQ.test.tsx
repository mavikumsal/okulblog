// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FAQ from "./FAQ";

const setLocation = vi.fn();

vi.mock("wouter", () => ({ useLocation: () => ["/destek/sss", setLocation] }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FAQ page", () => {
  it("referans başlığını, arama alanını ve dört SSS kaydını gösterir", () => {
    render(<FAQ />);

    expect(screen.getByText("Sıkça sorulan sorular")).toBeInTheDocument();
    expect(screen.getByLabelText("SSS içinde ara")).toBeInTheDocument();
    expect(screen.getByText("Üyelik zorunlu mu?")).toBeInTheDocument();
    expect(screen.getByText("Bir sorun veya öneriyi nereye iletebilirim?")).toBeInTheDocument();
  });

  it("arama sonucunu anında filtreler", () => {
    render(<FAQ />);

    fireEvent.change(screen.getByLabelText("SSS içinde ara"), { target: { value: "üyelik" } });

    expect(screen.getByText("Üyelik zorunlu mu?")).toBeInTheDocument();
    expect(screen.queryByText("Öğretmenler içerik ekleyebilir mi?")).not.toBeInTheDocument();
  });

  it("ana sayfaya dön kontrolünü kullanır", () => {
    render(<FAQ />);

    fireEvent.click(screen.getByRole("button", { name: "Ana sayfaya dön" }));
    expect(setLocation).toHaveBeenCalledWith("/");
  });
});
