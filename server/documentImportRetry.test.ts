import { describe, expect, it } from "vitest";
import { documentImportRetryPolicy } from "./documentImportRetry";

describe("document import retry policy", () => {
  it("limits automatic retries and uses a bounded interval", () => {
    expect(documentImportRetryPolicy.maxAttempts).toBe(4);
    expect(documentImportRetryPolicy.intervalMinutes).toBe(15);
  });
});
