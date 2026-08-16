import { describe, expect, it } from "vitest";
import { getSlideNavigation } from "../client/src/lib/homeSlide";

describe("getSlideNavigation", () => {
  it("handles section and internal application links", () => {
    expect(getSlideNavigation("#yolculuk")).toEqual({ kind: "anchor", target: "yolculuk" });
    expect(getSlideNavigation("/panel")).toEqual({ kind: "internal", target: "/panel" });
  });

  it("accepts only HTTP(S) external links and falls back safely", () => {
    expect(getSlideNavigation("https://okulblog.com/duyuru")).toEqual({ kind: "external", target: "https://okulblog.com/duyuru" });
    expect(getSlideNavigation("javascript:alert(1)")).toEqual({ kind: "anchor", target: "icerikler" });
  });
});
