export type ExploreViewMode = "list" | "map";

let cachedExploreViewMode: ExploreViewMode = "list";

export function getCachedExploreViewMode(): ExploreViewMode {
  return cachedExploreViewMode;
}

export function setCachedExploreViewMode(viewMode: ExploreViewMode) {
  cachedExploreViewMode = viewMode;
}
