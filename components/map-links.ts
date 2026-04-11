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
  const encodedQuery = encodeURIComponent(input.placeQuery);
  const universalUrl = input.placeId
    ? `https://www.google.com/maps/search/?api=1&query=${encodedQuery}&query_place_id=${input.placeId}`
    : `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  if (Platform.OS === "ios") {
    const iosGoogleMapsUrl = input.placeId
      ? `comgooglemaps://?q=${encodedQuery}&query_place_id=${input.placeId}`
      : `comgooglemaps://?q=${encodedQuery}`;

    try {
      const canOpenGoogleMaps = await Linking.canOpenURL("comgooglemaps://");
      if (canOpenGoogleMaps) {
        await Linking.openURL(iosGoogleMapsUrl);
        return;
      }
    } catch {
      // Fall through to the universal Google Maps URL.
    }
  }

  await Linking.openURL(universalUrl);
}
