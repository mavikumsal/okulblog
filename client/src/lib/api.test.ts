import { describe, expect, it } from "vitest";
import { apiUrl } from "./api";

describe("deployment API URL helper", () => {
  it("keeps relative API paths for single-server deployments", () => {
    expect(apiUrl("/api/trpc")).toBe("/api/trpc");
  });

  it("normalizes a path when called without a leading slash", () => {
    expect(apiUrl("api/trpc")).toBe("/api/trpc");
  });
});
