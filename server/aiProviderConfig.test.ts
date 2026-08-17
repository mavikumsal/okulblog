import { describe, expect, it } from "vitest";
import { getAiProviderConfig, maskSecret } from "./aiProviderConfig";

describe("AI provider configuration", () => {
  it("anahtarlar yokken güvenli biçimde yapılandırılmamış durum döndürür", () => {
    const config = getAiProviderConfig({ OPENAI_API_KEY: "", GEMINI_API_KEY: "" });

    expect(config.openai.configured).toBe(false);
    expect(config.gemini.configured).toBe(false);
    expect(config.openai.apiKey).toBeUndefined();
    expect(config.gemini.apiKey).toBeUndefined();
  });

  it("secret değerini tam olarak açığa çıkarmadan maskeler", () => {
    expect(maskSecret("sk-test-123456789")).toBe("sk-t•••••••••6789");
    expect(maskSecret("")).toBe("");
  });
});
