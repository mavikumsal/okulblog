export type AiProvider = "openai" | "gemini";

export type AiProviderConfig = {
  provider: AiProvider;
  configured: boolean;
  apiKey?: string;
  defaultModel: string;
  models: string[];
};

export function maskSecret(value: string | undefined) {
  if (!value) return "";
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 4)}${"•".repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
}

export function getAiProviderConfig(env: {
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
}): { openai: AiProviderConfig; gemini: AiProviderConfig } {
  return {
    openai: {
      provider: "openai",
      configured: Boolean(env.OPENAI_API_KEY?.trim()),
      apiKey: env.OPENAI_API_KEY?.trim() || undefined,
      defaultModel: "gpt-5-mini",
      models: ["gpt-5-nano", "gpt-5-mini", "gpt-5", "gpt-5.5"],
    },
    gemini: {
      provider: "gemini",
      configured: Boolean(env.GEMINI_API_KEY?.trim()),
      apiKey: env.GEMINI_API_KEY?.trim() || undefined,
      defaultModel: "gemini-3-flash-preview",
      models: ["gemini-3-flash-preview", "gemini-3.1-pro-preview"],
    },
  };
}
