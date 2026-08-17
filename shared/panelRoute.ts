export function getPanelSectionFromRoute(pathname: string, search = "") {
  const pathSection = pathname.split("/")[2];
  if (pathSection) return pathSection;
  const querySection = new URLSearchParams(search).get("section");
  return querySection || "genel";
}

export function getPanelPathname(pathname: string) {
  return pathname.split("?")[0];
}

export function getPanelSectionLabelPath(pathname: string, search = "") {
  const section = getPanelSectionFromRoute(pathname, search);
  return section === "genel" ? "/panel" : `/panel/${section}`;
}
