export type SlideNavigation =
  | { kind: "anchor"; target: string }
  | { kind: "internal"; target: string }
  | { kind: "external"; target: string };

/** Converts an admin-provided slider link into an allowed client-side destination. */
export function getSlideNavigation(rawTarget?: string | null): SlideNavigation {
  const target = rawTarget?.trim() || "#icerikler";

  if (target.startsWith("#")) {
    return { kind: "anchor", target: target.slice(1) || "icerikler" };
  }

  if (target.startsWith("/") && !target.startsWith("//")) {
    return { kind: "internal", target };
  }

  try {
    const url = new URL(target);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return { kind: "external", target: url.toString() };
    }
  } catch {
    // Invalid values intentionally use the safe default below.
  }

  return { kind: "anchor", target: "icerikler" };
}
