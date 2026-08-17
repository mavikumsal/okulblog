export type PanelContentType = "test" | "document" | "simulation" | "video" | "game" | "news";

export const panelContentTypeByRoute: Record<string, PanelContentType> = {
  testler: "test",
  dokumanlar: "document",
  simulasyonlar: "simulation",
  videolar: "video",
  oyunlar: "game",
  haberler: "news",
};

export function getPanelContentType(route: string): PanelContentType | undefined {
  return panelContentTypeByRoute[route];
}

export const panelContentTypeLabels: Record<PanelContentType, string> = {
  test: "Testler",
  document: "Dokümanlar",
  simulation: "Simülasyonlar",
  video: "Videolar",
  game: "Oyunlar",
  news: "Haberler",
};
