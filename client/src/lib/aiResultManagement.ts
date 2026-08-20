export type AiSourceRegion = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
  coordinateSpace: "pdf-points";
};

export type AiDraftResult = {
  id: string;
  questionType: "multiple-choice" | "true-false" | "open-ended";
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  sourceFileName?: string;
  sourcePage?: number;
  sourceRegion?: AiSourceRegion | null;
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

export function selectAiDraftResults(results: AiDraftResult[], selectedIds: string[]) {
  return results.filter(result => selectedIds.includes(result.id));
}

export function validateAiDraftResultsForBulkSave(results: AiDraftResult[]) {
  const invalid = results.find(result =>
    result.prompt.trim().length < 12 ||
    (result.questionType === "multiple-choice" && result.options.filter(Boolean).length < 2),
  );
  return { valid: !invalid, invalidId: invalid?.id ?? null };
}

export function reorderSelectedIds(ids: number[], draggedId: number, targetId: number) {
  if (draggedId === targetId) return ids;
  const next = [...ids];
  const fromIndex = next.indexOf(draggedId);
  const toIndex = next.indexOf(targetId);
  if (fromIndex < 0 || toIndex < 0) return ids;
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, draggedId);
  return next;
}
