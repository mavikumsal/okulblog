import type { AiProvider } from "./aiProviderConfig";

export type DynamicAiModel = {
  id: string;
  displayName: string;
  provider: AiProvider;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportsText: boolean;
  supportsVision: boolean;
  supportsStructuredOutput: boolean;
  generationCompatible: boolean;
  source: "remote" | "fallback";
};

const fallbackModels: Record<AiProvider, DynamicAiModel[]> = {
  openai: [
    { id: "gpt-5-nano", displayName: "GPT-5 Nano", provider: "openai", supportsText: true, supportsVision: true, supportsStructuredOutput: true, generationCompatible: true, source: "fallback" },
    { id: "gpt-5-mini", displayName: "GPT-5 Mini", provider: "openai", supportsText: true, supportsVision: true, supportsStructuredOutput: true, generationCompatible: true, source: "fallback" },
    { id: "gpt-5", displayName: "GPT-5", provider: "openai", supportsText: true, supportsVision: true, supportsStructuredOutput: true, generationCompatible: true, source: "fallback" },
  ],
  gemini: [
    { id: "gemini-3-flash-preview", displayName: "Gemini 3 Flash", provider: "gemini", supportsText: true, supportsVision: true, supportsStructuredOutput: true, generationCompatible: true, source: "fallback" },
    { id: "gemini-3.1-pro-preview", displayName: "Gemini 3.1 Pro", provider: "gemini", supportsText: true, supportsVision: true, supportsStructuredOutput: true, generationCompatible: true, source: "fallback" },
  ],
};

function openAiModels(apiKey: string): Promise<DynamicAiModel[]> {
  return fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } }).then(async response => {
    if (!response.ok) throw new Error(`OpenAI model listesi alınamadı (${response.status}).`);
    const body = (await response.json()) as { data?: Array<{ id: string; owned_by?: string }> };
    return (body.data ?? [])
      .filter(model => /^(gpt-|o[1-9]|chatgpt-)/i.test(model.id))
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(model => ({ id: model.id, displayName: model.id, provider: "openai" as const, description: model.owned_by ? `Sahip: ${model.owned_by}` : undefined, supportsText: true, supportsVision: /vision|4o|gpt-5/i.test(model.id), supportsStructuredOutput: true, generationCompatible: true, source: "remote" as const }));
  });
}

function geminiModels(apiKey: string): Promise<DynamicAiModel[]> {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, { headers: { Accept: "application/json" } }).then(async response => {
    if (!response.ok) throw new Error(`Gemini model listesi alınamadı (${response.status}).`);
    const body = (await response.json()) as { models?: Array<{ name: string; displayName?: string; description?: string; inputTokenLimit?: number; outputTokenLimit?: number; supportedGenerationMethods?: string[] }> };
    return (body.models ?? [])
      .map(model => ({
        id: model.name.replace(/^models\//, ""),
        displayName: model.displayName ?? model.name.replace(/^models\//, ""),
        provider: "gemini" as const,
        description: model.description,
        inputTokenLimit: model.inputTokenLimit,
        outputTokenLimit: model.outputTokenLimit,
        supportsText: true,
        supportsVision: /vision|pro|flash/i.test(model.name),
        supportsStructuredOutput: true,
        generationCompatible: model.supportedGenerationMethods?.includes("generateContent") ?? false,
        source: "remote" as const,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  });
}

export async function listProviderModels(provider: AiProvider, apiKey?: string) {
  if (!apiKey?.trim()) return { models: fallbackModels[provider], source: "fallback" as const, configured: false };
  try {
    const models = provider === "openai" ? await openAiModels(apiKey.trim()) : await geminiModels(apiKey.trim());
    return { models: models.length ? models : fallbackModels[provider], source: models.length ? "remote" as const : "fallback" as const, configured: true };
  } catch (error) {
    return { models: fallbackModels[provider], source: "fallback" as const, configured: true, error: error instanceof Error ? error.message : "Model listesi alınamadı." };
  }
}

export function getFallbackProviderModels(provider: AiProvider) {
  return fallbackModels[provider];
}
