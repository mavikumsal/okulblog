import { describe, expect, it } from "vitest";
import { getSecurityEventPage } from "./Panel";

type Event = { id: number; severity: string };

const events: Event[] = [
  { id: 1, severity: "critical" },
  { id: 2, severity: "high" },
  { id: 3, severity: "medium" },
  { id: 4, severity: "low" },
  { id: 5, severity: "medium" },
  { id: 6, severity: "low" },
];

describe("security event filters and pagination", () => {
  it("filters events by severity", () => {
    const result = getSecurityEventPage(events, "medium", 1, 5);
    expect(result.filtered.map(event => event.id)).toEqual([3, 5]);
    expect(result.items).toHaveLength(2);
    expect(result.pageCount).toBe(1);
  });

  it("paginates the unfiltered event list", () => {
    const result = getSecurityEventPage(events, "all", 2, 3);
    expect(result.page).toBe(2);
    expect(result.items.map(event => event.id)).toEqual([4, 5, 6]);
    expect(result.pageCount).toBe(2);
  });

  it("clamps invalid pages to the available range", () => {
    const result = getSecurityEventPage(events, "low", 8, 1);
    expect(result.page).toBe(2);
    expect(result.items.map(event => event.id)).toEqual([6]);
  });
});
