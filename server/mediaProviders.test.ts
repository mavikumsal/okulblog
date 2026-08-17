import { afterEach, describe, expect, it } from "vitest";
import { getProviderConfiguration, isSupportedMediaProvider, providerAssetMode } from "./mediaProviders";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("media provider configuration", () => {
  it("reports Google Drive as unconfigured before hosting secrets are entered", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(getProviderConfiguration("google-drive-personal")).toMatchObject({
      configured: false,
      mode: "oauth",
      missing: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    });
  });

  it("recognizes Bunny Stream when its API and library settings exist", () => {
    process.env.BUNNY_API_KEY = "key";
    process.env.BUNNY_STREAM_LIBRARY_ID = "123";
    expect(getProviderConfiguration("bunny-stream")).toMatchObject({ configured: true, mode: "api-key" });
    expect(providerAssetMode("bunny-stream")).toBe("video");
  });

  it("separates provider asset modes and rejects unknown providers", () => {
    expect(providerAssetMode("bunny-dns")).toBe("dns");
    expect(providerAssetMode("adsense")).toBe("ad");
    expect(providerAssetMode("search-console")).toBe("seo");
    expect(isSupportedMediaProvider("google-drive-workspace")).toBe(true);
    expect(isSupportedMediaProvider("dropbox")).toBe(false);
  });
});
