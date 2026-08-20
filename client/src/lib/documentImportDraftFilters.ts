export type DocumentDraftStatusFilter = "draft" | "pending" | "approved" | "rejected" | "";
export type DocumentDraftAiFilter = "not_started" | "processing" | "completed" | "failed" | "";

export const DEFAULT_DOCUMENT_DRAFT_STATUS_FILTER: DocumentDraftStatusFilter = "";

export function buildDocumentDraftFilterInput(input: {
  status: DocumentDraftStatusFilter;
  aiStatus: DocumentDraftAiFilter;
  from: string;
  to: string;
}) {
  return {
    status: input.status || undefined,
    aiStatus: input.aiStatus || undefined,
    from: input.from ? new Date(`${input.from}T00:00:00`) : undefined,
    to: input.to ? new Date(`${input.to}T23:59:59.999`) : undefined,
  };
}

export function getDocumentDraftStatusLabel(status: DocumentDraftStatusFilter) {
  if (status === "draft") return "Taslak";
  if (status === "pending") return "Onay bekliyor";
  if (status === "approved") return "Yayınlandı";
  if (status === "rejected") return "Reddedildi";
  return "Tüm durumlar";
}

export function shouldShowImportedDraftByDefault(status: string) {
  return Boolean(status);
}
