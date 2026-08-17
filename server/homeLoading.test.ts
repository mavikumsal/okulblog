import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getHomeLoaderDelay, getHomeLoaderState, HOME_LOADER_MIN_MS } from "../client/src/lib/homeLoading";

describe("home loading screen", () => {
  it("stays visible while homepage data is not ready", () => {
    expect(getHomeLoaderState(false, 1_000, 1_200)).toEqual({ show: true, delay: null });
  });

  it("keeps the loader visible for the minimum duration after data is ready", () => {
    expect(getHomeLoaderState(true, 1_000, 1_200)).toEqual({ show: true, delay: HOME_LOADER_MIN_MS - 200 });
  });

  it("does not add delay after the minimum duration has elapsed", () => {
    expect(getHomeLoaderDelay(1_000, 2_000)).toBe(0);
  });

  it("handles a future timestamp without returning a negative delay", () => {
    expect(getHomeLoaderDelay(1_200, 1_000)).toBe(HOME_LOADER_MIN_MS);
  });

  it("disables loader animations for reduced-motion users", () => {
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".loader-orbit, .loader-dot { animation: none; }");
  });
});
