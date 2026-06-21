export type CourseStyle = "PARKLAND" | "LINKS" | "COASTAL" | "DESERT";

export type CourseRecord = {
  id: string;
  title: string;
  price: string;
  rating: string;
  location: string;
  placeQuery: string;
  placeId?: string;
  image: string;
  style: CourseStyle;
  isGetaway?: boolean;
  coordinates: {
    latitude: number;
    longitude: number;
  };
};

export const DEFAULT_USER_LOCATION = {
  latitude: 6.9271,
  longitude: 79.8612,
};

let cachedUserLocation: { latitude: number; longitude: number } | null = null;
let lastLocationFetchTime = 0;

export function getCachedUserLocation() {
  return cachedUserLocation;
}

export function setCachedUserLocation(coords: { latitude: number; longitude: number } | null) {
  cachedUserLocation = coords;
  lastLocationFetchTime = coords ? Date.now() : 0;
}

export function shouldRefreshLocation(): boolean {
  if (!cachedUserLocation) return true;
  // Refresh location if the cached data is older than 5 minutes
  return (Date.now() - lastLocationFetchTime) > 300000;
}

export const SRI_LANKA_MAP_REGION = {
  latitude: 7.8731,
  longitude: 80.7718,
  latitudeDelta: 4.5,
  longitudeDelta: 2.5,
};

export const STYLE_OPTIONS: CourseStyle[] = ["PARKLAND", "LINKS", "COASTAL", "DESERT"];

export function calculateDistanceKm(
  pos1: { latitude: number; longitude: number },
  pos2: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (pos2.latitude - pos1.latitude) * (Math.PI / 180);
  const dLon = (pos2.longitude - pos1.longitude) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pos1.latitude * (Math.PI / 180)) *
      Math.cos(pos2.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
