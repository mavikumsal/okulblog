import { describe, expect, it } from "vitest";
import { getPanelContentType, panelContentTypeLabels } from "@shared/panelModules";

describe("panel content modules", () => {
  it("maps each visible Admin route to the correct content type", () => {
    expect(getPanelContentType("testler")).toBe("test");
    expect(getPanelContentType("dokumanlar")).toBe("document");
    expect(getPanelContentType("videolar")).toBe("video");
    expect(getPanelContentType("simulasyonlar")).toBe("simulation");
    expect(getPanelContentType("oyunlar")).toBe("game");
    expect(getPanelContentType("haberler")).toBe("news");
  });

  it("keeps user-facing Turkish labels aligned with the content contract", () => {
    expect(panelContentTypeLabels.test).toBe("Testler");
    expect(panelContentTypeLabels.document).toBe("Dokümanlar");
    expect(panelContentTypeLabels.news).toBe("Haberler");
  });

  it("returns undefined for non-content routes", () => {
    expect(getPanelContentType("kategoriler")).toBeUndefined();
    expect(getPanelContentType("ana-sayfa-yonetimi")).toBeUndefined();
  });
});
