import { describe, expect, it } from "vitest";
import {
  buildDocumentDraftFilterInput,
  DEFAULT_DOCUMENT_DRAFT_STATUS_FILTER,
  getDocumentDraftStatusLabel,
  shouldShowImportedDraftByDefault,
} from "./documentImportDraftFilters";

describe("document import draft filters", () => {
  it("shows every imported draft by default instead of hiding draft-status records", () => {
    expect(DEFAULT_DOCUMENT_DRAFT_STATUS_FILTER).toBe("");
    expect(buildDocumentDraftFilterInput({ status: DEFAULT_DOCUMENT_DRAFT_STATUS_FILTER, aiStatus: "", from: "", to: "" })).toEqual({
      status: undefined,
      aiStatus: undefined,
      from: undefined,
      to: undefined,
    });
    expect(shouldShowImportedDraftByDefault("draft")).toBe(true);
  });

  it("preserves explicit status and AI/date filters", () => {
    const result = buildDocumentDraftFilterInput({
      status: "pending",
      aiStatus: "completed",
      from: "2026-08-20",
      to: "2026-08-21",
    });

    expect(result.status).toBe("pending");
    expect(result.aiStatus).toBe("completed");
    expect(result.from?.toISOString()).toBe("2026-08-20T00:00:00.000Z");
    expect(result.to?.toISOString()).toBe("2026-08-21T23:59:59.999Z");
  });

  it("labels all status options for the queue", () => {
    expect(getDocumentDraftStatusLabel("")).toBe("Tüm durumlar");
    expect(getDocumentDraftStatusLabel("draft")).toBe("Taslak");
    expect(getDocumentDraftStatusLabel("pending")).toBe("Onay bekliyor");
  });
});
