export type AiDraftResult = {
  id: string;
  questionType: "multiple-choice" | "true-false" | "open-ended";
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  sourceFileName?: string;
  sourcePage?: number;
};

export function updateAiDraftResult(
  results: AiDraftResult[],
  id: string,
  patch: Partial<AiDraftResult>,
) {
  return results.map(result => result.id === id ? { ...result, ...patch } : result);
}

export function removeAiDraftResult(results: AiDraftResult[], id: string) {
  return results.filter(result => result.id !== id);
}

export function getAiModelCapabilityLabels(model: { capabilities?: unknown } | undefined) {
  return Array.isArray(model?.capabilities)
    ? model.capabilities.filter((item): item is string => typeof item === "string")
    : [];
}

export function formatAiQuotaStatus(quota: unknown) {
  return typeof quota === "string" && quota.trim() ? quota : "API anahtarı sonrası görünür";
}
