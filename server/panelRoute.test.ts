import { describe, expect, it } from "vitest";
import { getPanelPathname, getPanelSectionFromRoute, getPanelSectionLabelPath } from "@shared/panelRoute";

describe("panel route resolution", () => {
  it("resolves a path section", () => {
    expect(getPanelSectionFromRoute("/panel/testler")).toBe("testler");
  });

  it("resolves query section when the path is the panel root", () => {
    expect(getPanelSectionFromRoute("/panel", "?section=uyeler")).toBe("uyeler");
  });

  it("normalizes query-bearing paths for active sidebar state", () => {
    expect(getPanelPathname("/panel/testler?section=testler")).toBe("/panel/testler");
    expect(getPanelSectionLabelPath("/panel", "?section=uyeler")).toBe("/panel/uyeler");
  });
});
