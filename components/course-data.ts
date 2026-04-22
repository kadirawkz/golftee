export const STYLE_OPTIONS = ["LINKS", "PARKLAND", "DESERT", "COASTAL"] as const;
export type CourseStyle = (typeof STYLE_OPTIONS)[number];
export type BadgeStyle = "gold" | "green";

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
  coordinates: {
    latitude: number;
    longitude: number;
  };
};

export type NearbyCourseRecord = {
  id: string;
  title: string;
  meta: string;
  price: string;
  rating: string;
  badge: string;
  image: string;
  badgeStyle: BadgeStyle;
};

export type GetawayCourseRecord = {
  id: string;
  title: string;
  place: string;
  image: string;
};

export const SRI_LANKA_MAP_REGION = {
  latitude: 7.8731,
  longitude: 80.7718,
  latitudeDelta: 3.5,
  longitudeDelta: 2.2,
} as const;

export const DEFAULT_USER_LOCATION: { latitude: number; longitude: number } = {
  latitude: 6.9271,
  longitude: 79.8612,
};

export function calculateDistanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusKm * centralAngle;
}
