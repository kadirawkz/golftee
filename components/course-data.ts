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

function pickStyle(seed: string): CourseStyle {
  const value = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return STYLE_OPTIONS[value % STYLE_OPTIONS.length];
}

const featuredCourses = [
  {
    id: "1",
    title: "Royal Colombo Golf Club",
    price: "$120",
    rating: "4.9",
    location: "Colombo",
    placeQuery: "Royal Colombo Golf Club, Colombo, Sri Lanka",
    coordinates: { latitude: 6.905285380135911, longitude: 79.88419185299367 },
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBFQTuBLe-u9FmukU3SbNqqdu9ybgr516nOv7pIwNqJMyOdvzkJNlpecYklTJRLn23WmSdej7h_1PeRAbRY5NwkwjlKUVeMwzNz4otStyk8hkhwncL_f1zt8JxrDJS0l0n0QdXzQalyyxCB3o1Uh9DT7uEEjnKspurv5JeH7qNQ9l4bV9ykKP8NbNSqMPlmAjZ-m6UDxUCAnzOJsLvH3kgFViRtbYyM2sHrH640XNMpsIKPFpJYb-WTFF2gOmZ24dEDrtC8ohCD6Gw",
  },
  {
    id: "2",
    title: "Victoria Golf & Country Resort",
    price: "$85",
    rating: "4.7",
    location: "Kandy / Digana",
    placeQuery: "Victoria Golf & Country Resort, Digana, Sri Lanka",
    coordinates: { latitude: 7.264680696986498, longitude: 80.77403805582475 },
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBjFo59jzOkI8-rO5frZNhtdjOiYRt03WfnXDDG2L4auf1lfvlvQFfKkwCIJ0F-kPui754kDVL6wn2X4vSigAzfQnCCjPEQo1gOOVWiPHa146pimZe5ClBkkz64WVvNTd6IWiNt3FBjdA3tvbyNTLJJcT3oRe8Edt0286YpuVJPrSmJJkeZyl3cNnGIKyvBSS7BwfPo7yRTbQpHkA5jsQUcq1Hiw3CVBky9zg4demJUXPsKxHvcuNIM1cdkM6HX0Mg7UI0wnvyBmNc",
  },
  {
    id: "3",
    title: "Nuwara Eliya Golf Club",
    price: "$145",
    rating: "4.8",
    location: "Nuwara Eliya",
    placeQuery: "Nuwara Eliya Golf Club, Nuwara Eliya, Sri Lanka",
    coordinates: { latitude: 6.971971282155486, longitude: 80.76571996611204 },
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBR2vOLXJsdBEqWB6Q9upkrN10Svhfc246lYZU4Fni0ScD-0JEHntcZj8NMErKGhaqy74dz5jvl6jlTO1W4n5T6q3a-GDJQiq1E5SGB91pMi5cqGoYrHgdFDQzDjDomSDVuNFk2Ihl7RABF3xVnk6-R8B__IgTG624jx4CIL43zQviW_lEl0Sz8un_M0iV16w5nyOaB5ZYmNAV4IytXOyuCrE6jwGwO9S462sVb2WKw9GxCtcf3O-F0tM_ULIW875SVwC111cm1Jc8",
  },
  {
    id: "4",
    title: "Eagles Golf Link",
    price: "$110",
    rating: "4.6",
    location: "Trincomalee",
    placeQuery: "Eagles Golf Link, Trincomalee, Sri Lanka",
    coordinates: { latitude: 8.535798504973808, longitude: 81.19818322309355 },
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDpvFBwGBjyRw5Mem3SVr2AHnm794__vb9sSGUsv0QxbHyUH0YcGJZyWjAjb66vrbEc_EZCcQSpZyMghcTdy95ZkH26Mw4qmKUbrrfyOUKUlka8C0e8l3J8BRMgMfCkaDsNPWckcGbGO_Jo_gAg-DPXkYt6PN__50HZieWdaiTLYRltjVFHz7tZAWur9Q-B2g67T5-i-CF73a-w6KAAo17EmNI40zaJbdTOEnz1Dzphn0lJDPCFHhwmdnjJmsUerwBOEzSggKyuqms",
  },
  {
    id: "5",
    title: "Eagles Heritage Golf Club",
    price: "$95",
    rating: "4.5",
    location: "Anuradhapura",
    placeQuery: "Eagles Heritage Golf Club, Anuradhapura, Sri Lanka",
    coordinates: { latitude: 8.296735106202165, longitude: 80.42496812379707 },
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCXVAcC8Jz0cxWoEcL8HzY41-Xl0S7u8IJAyeDp58DmmhgwWPAqeD8HgZUchre51G5mu6x7XO3__KfQHSnC5eer3jPdBsvGjSs1VPZkGCDDHwspT8ro3Za5Jnk_e4KeOeNDGSDCj3MoCGUXJBUfGt9AniK9XZtnt7hYfujjT_FKIFXBLRzGYZCkZpmtlXI-BwsmjH-EZ7IpGSUsABmjjyM8uXvjd9_Fra4ulzKVRmOyIyUu36KFG0O4_Apl8QjuDCxtFr2EBXKmh7w",
  },
  {
    id: "6",
    title: "Shangri La Hambantota Golf Resort & Spa",
    price: "$155",
    rating: "4.9",
    location: "Hambantota",
    placeQuery: "Shangri La Hambantota Golf Resort & Spa, Hambantota, Sri Lanka",
    coordinates: { latitude: 6.112915947036785, longitude: 81.06407119678414 },
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBut3NJMZaZTZ2-bmwu4OkdeZWK3U-d1wyW1gmn99dV80PF4sd-8KusqMSGria4aB7Jyt80OaWM7ZetSr59mdfzzHxTSNUVhOLYXhQu867Y_O-5GSAWAJATeVjYd8CNZa1WKQRDRycSVR8ZleCz-5AhlfmyBaO-zAesitS1YzQjkPXZGT_JeGibjGF5x1gbVlBh3lkh7Oac6cIcF-BM0iA0NBFT7cgy38VUNHuheRaMvFlOAU_jylr-jXkogprFvozbmSvjgg2aoto",
  },
  {
    id: "7",
    title: "Koggala Golf Club",
    price: "$130",
    rating: "4.8",
    location: "Koggala",
    placeQuery: "Koggala Golf Club, Koggala, Sri Lanka",
    coordinates: { latitude: 5.996820130056448, longitude: 80.32463590631559 },
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA0640pZ_20kbgD7XrQUbBD5Pjpy4xkGtvKNPjjj4L1hitNXjYktH26mbFSwUQIaHspT0a-U5N0jnLe745HI-aDY9i9Su2SfrtizuLtTpZI3DLzCALg_C9LMEDDsGkWTjZc-0CilhSDw-CVsFmxNvE6jqqVL6AE1DyXwXc1_fmWILIa94wLMRxBazupMapu8HyNDTTsn5ahjIy-ka34UlslSTcuSRrCFsSeQa8F6voYhIfN5MaObRDLhIei3L5w926oyavHx9I5A20",
  },
  {
    id: "8",
    title: "Army Golf Course",
    price: "$210",
    rating: "4.7",
    location: "Diyathalawa",
    placeQuery: "Army Golf Course, Diyatalawa, Sri Lanka",
    coordinates: { latitude: 6.809702575280297, longitude: 80.94806013954602 },
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD31va63-poQTz5DcokODagG8JILUhhL-OdfABzYz32H9Ai45HxghyORQuW-Fn6CERGSBCHBNBk_JkINDdjugFA2bd84JXqM5xXR995T0nPgCq12n3wqlMdxu3mJM6B_pNCIXdWbBdEN4_rxEjYCZJMpyP86-lfqZsixsCKnqTaG0TVh0wMTMoTYGndn6E7JXPlqBH3rHQIaL45Ymb8OgfPBxUKKOfyXSbSHnNDavOLwz5SGZem6kOq_e6cA7vSQeJe7FfuelZPZo8",
  },
];

export const allCourses: CourseRecord[] = featuredCourses
  .map((course) => ({
    ...course,
    style: pickStyle(`${course.id}-${course.title}`),
  }))
  .sort((a, b) => a.title.localeCompare(b.title));

const COURSE_BY_ID = new Map(allCourses.map((course) => [course.id, course]));

export function getCourseById(id: string | undefined) {
  return (id ? COURSE_BY_ID.get(id) : undefined) ?? allCourses[0];
}

const nearbyCourseIds = allCourses.slice(3, 6).map((course) => course.id);
const nearbyBaseCourses: CourseRecord[] = nearbyCourseIds
  .map((id) => COURSE_BY_ID.get(id))
  .filter((course): course is CourseRecord => course !== undefined);

export const featuredHomeCourses: CourseRecord[] = allCourses.slice(0, 3);
export const nearbyHomeCourses: NearbyCourseRecord[] = nearbyBaseCourses.map((course) => ({
  id: course.id,
  title: course.title,
  meta: course.location,
  price: course.price,
  rating: course.rating,
  badge: course.style,
  image: course.image,
  badgeStyle: course.style === "COASTAL" ? "green" : "gold",
}));

export const nearbyExploreCourses: CourseRecord[] = nearbyBaseCourses;

export const getawayHomeCourses: GetawayCourseRecord[] = allCourses.slice(4, 8).map((course) => ({
  id: course.id,
  title: course.title,
  place: course.location,
  image: course.image,
}));

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
