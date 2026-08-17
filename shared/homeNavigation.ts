export function getHomeAccountLabel(isAuthenticated: boolean, loading: boolean) {
  if (loading) return "Yükleniyor...";
  return isAuthenticated ? "Panele git" : "Giriş yap";
}

export function getHomePrimaryLabel(isAuthenticated: boolean) {
  return isAuthenticated ? "Panele git" : "Başla";
}

export function getHomeTarget(isAuthenticated: boolean, target: string) {
  return isAuthenticated ? target : "login";
}
