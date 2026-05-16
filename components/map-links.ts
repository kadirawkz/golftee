import { Linking, Platform } from "react-native";

type Coordinates = {
  latitude: number;
  longitude: number;
};

export async function openInGoogleMaps(
  input: {
    coordinates?: Coordinates;
    placeQuery: string;
    placeId?: string;
  }
) {
  const lat = input.coordinates?.latitude;
  const lng = input.coordinates?.longitude;
  const encodedQuery = encodeURIComponent(input.placeQuery);
  
  // 1. Coordinates-First Approach: Using lat,lng as the primary query is the only 
  // way to guarantee that unique locations open for every course.
  // We include the place name as a bias/label where possible.
  let universalUrl = (lat && lng)
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
  
  if (input.placeId) {
    universalUrl += `&query_place_id=${input.placeId}`;
  }

  if (Platform.OS === "android") {
    // Android specific geo: intent is often more reliable for pinpointing coordinates
    const geoUrl = (lat && lng)
      ? `geo:${lat},${lng}?q=${lat},${lng}(${encodedQuery})`
      : `geo:0,0?q=${encodedQuery}`;
    
    try {
      await Linking.openURL(geoUrl);
      return;
    } catch {
      // Fall through to universal URL
    }
  }

  if (Platform.OS === "ios") {
    // For iOS Google Maps App Scheme
    let iosGoogleMapsUrl = (lat && lng)
      ? `comgooglemaps://?q=${lat},${lng}&zoom=14`
      : `comgooglemaps://?q=${encodedQuery}`;
    
    if (input.placeId) {
      iosGoogleMapsUrl += `&query_place_id=${input.placeId}`;
    }

    try {
      const canOpenGoogleMaps = await Linking.canOpenURL("comgooglemaps://");
      if (canOpenGoogleMaps) {
        await Linking.openURL(iosGoogleMapsUrl);
        return;
      }
    } catch {
      // Fall through to universal URL
    }
  }

  await Linking.openURL(universalUrl);
}
