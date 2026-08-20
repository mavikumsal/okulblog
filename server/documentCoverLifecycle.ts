export function safeDocumentCoverStem(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/\.pdf$/i, "").slice(0, 160);
}

export function getStableDocumentCoverKey(userId: number, fileName: string): string {
  return `okulblog/imported/${userId}/previews/${safeDocumentCoverStem(fileName || "document.pdf")}-cover.webp`;
}

export function describeCoverReplacement(previousCoverImageUrl: string | null | undefined, nextCoverImageUrl: string) {
  return {
    previousCoverImageUrl: previousCoverImageUrl ?? null,
    coverImageUrl: nextCoverImageUrl,
    archived: Boolean(previousCoverImageUrl && previousCoverImageUrl !== nextCoverImageUrl),
  };
}
