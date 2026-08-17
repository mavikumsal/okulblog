import { describe, expect, it, vi } from "vitest";
import { getFallbackProviderModels, listProviderModels } from "./aiProviderCatalog";

describe("dynamic AI provider catalog", () => {
  it("returns a safe generation-capable fallback without an API key", async () => {
    const result = await listProviderModels("openai");
    expect(result.configured).toBe(false);
    expect(result.source).toBe("fallback");
    expect(result.models.length).toBeGreaterThan(0);
    expect(result.models.every(model => model.generationCompatible)).toBe(true);
  });

  it("keeps provider identity and capability metadata in fallback models", () => {
    expect(getFallbackProviderModels("gemini").every(model => model.provider === "gemini")).toBe(true);
    expect(getFallbackProviderModels("gemini")[0]).toMatchObject({ supportsText: true, supportsStructuredOutput: true });
  });

  it("falls back without exposing an upstream error when the provider list fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 })));
    const result = await listProviderModels("gemini", "test-key");
    expect(result.configured).toBe(true);
    expect(result.source).toBe("fallback");
    expect(result.error).toContain("Gemini model listesi alınamadı");
    expect(result.models.length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });
});
