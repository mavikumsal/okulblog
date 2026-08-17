export type MediaProviderKey =
  | "s3"
  | "google-drive-personal"
  | "google-drive-workspace"
  | "bunny-storage"
  | "bunny-stream"
  | "bunny-dns"
  | "adsense"
  | "search-console";

export type ProviderConfiguration = {
  provider: MediaProviderKey;
  configured: boolean;
  missing: string[];
  mode: "built-in" | "oauth" | "api-key";
};

const env = (key: string) => process.env[key]?.trim() ?? "";

export function getProviderConfiguration(provider: MediaProviderKey): ProviderConfiguration {
  if (provider === "s3") {
    return { provider, configured: Boolean(env("BUILT_IN_FORGE_API_URL") && env("BUILT_IN_FORGE_API_KEY")), missing: [], mode: "built-in" };
  }

  if (provider === "google-drive-personal" || provider === "google-drive-workspace") {
    const missing = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"].filter(key => !env(key));
    return { provider, configured: missing.length === 0, missing, mode: "oauth" };
  }

  if (provider === "bunny-storage") {
    const missing = ["BUNNY_API_KEY", "BUNNY_STORAGE_ZONE_NAME", "BUNNY_STORAGE_ZONE_PASSWORD"].filter(key => !env(key));
    return { provider, configured: missing.length === 0, missing, mode: "api-key" };
  }

  if (provider === "bunny-stream") {
    const missing = ["BUNNY_API_KEY", "BUNNY_STREAM_LIBRARY_ID"].filter(key => !env(key));
    return { provider, configured: missing.length === 0, missing, mode: "api-key" };
  }

  if (provider === "bunny-dns") {
    const missing = ["BUNNY_API_KEY", "BUNNY_DNS_ZONE_ID"].filter(key => !env(key));
    return { provider, configured: missing.length === 0, missing, mode: "api-key" };
  }

  if (provider === "adsense") {
    const missing = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"].filter(key => !env(key));
    return { provider, configured: missing.length === 0, missing, mode: "oauth" };
  }

  const missing = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"].filter(key => !env(key));
  return { provider, configured: missing.length === 0, missing, mode: "oauth" };
}

export function providerAssetMode(provider: MediaProviderKey): "file" | "video" | "dns" | "ad" | "seo" {
  if (provider === "bunny-stream") return "video";
  if (provider === "bunny-dns") return "dns";
  if (provider === "adsense") return "ad";
  if (provider === "search-console") return "seo";
  return "file";
}

export function isSupportedMediaProvider(provider: string): provider is MediaProviderKey {
  return [
    "s3",
    "google-drive-personal",
    "google-drive-workspace",
    "bunny-storage",
    "bunny-stream",
    "bunny-dns",
    "adsense",
    "search-console",
  ].includes(provider);
}
