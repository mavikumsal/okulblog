export type ImportHistoryStatus = "all" | "completed" | "failed" | "retried" | "processing";
export type ImportHistoryProvider = "all" | "s3" | "bunny-storage";
export type ImportHistoryDateRange = "all" | "today" | "week" | "month";

export type ImportHistoryEntry = {
  status?: string;
  provider?: string | null;
  createdAt?: string | Date;
};

export function filterDocumentImportHistory<T extends ImportHistoryEntry>(
  entries: T[],
  filters: { status: ImportHistoryStatus; provider: ImportHistoryProvider; dateRange: ImportHistoryDateRange; now?: number },
): T[] {
  const now = filters.now ?? Date.now();
  const cutoff = filters.dateRange === "today" ? now - 86400000 : filters.dateRange === "week" ? now - 604800000 : filters.dateRange === "month" ? now - 2592000000 : 0;
  return entries.filter(entry => {
    const createdAt = entry.createdAt ? new Date(entry.createdAt).getTime() : 0;
    return (filters.status === "all" || entry.status === filters.status) && (filters.provider === "all" || entry.provider === filters.provider) && (!cutoff || (Number.isFinite(createdAt) && createdAt >= cutoff));
  });
}
