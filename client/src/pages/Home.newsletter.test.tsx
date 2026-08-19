import { describe, expect, it } from "vitest";
import { isValidNewsletterEmail } from "./Home";

describe("newsletter email validation", () => {
  it("accepts a normal email address", () => {
    expect(isValidNewsletterEmail("ogrenci@example.com")).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    expect(isValidNewsletterEmail("  ogretmen@example.org  ")).toBe(true);
  });

  it("rejects empty, malformed, and incomplete addresses", () => {
    expect(isValidNewsletterEmail("")).toBe(false);
    expect(isValidNewsletterEmail("ogrenci@")) .toBe(false);
    expect(isValidNewsletterEmail("ogrenci.example.com")).toBe(false);
    expect(isValidNewsletterEmail("ogrenci @example.com")).toBe(false);
  });
});
