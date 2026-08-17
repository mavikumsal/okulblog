export const HOME_LOADER_MIN_MS = 850;

export function getHomeLoaderDelay(startedAt: number, now = Date.now(), minimumMs = HOME_LOADER_MIN_MS) {
  return Math.max(0, minimumMs - Math.max(0, now - startedAt));
}

export function getHomeLoaderState(pageReady: boolean, startedAt: number, now = Date.now()) {
  if (!pageReady) return { show: true, delay: null };
  return { show: true, delay: getHomeLoaderDelay(startedAt, now) };
}
