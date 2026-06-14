import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, InteractionManager, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { CourseCard } from "../components/course-card";
import {
    calculateDistanceKm,
    CourseStyle,
    DEFAULT_USER_LOCATION,
    STYLE_OPTIONS,
} from "../components/course-data";
import { useCourseCatalog } from "../components/course-management";
import { openInGoogleMaps } from "../components/map-links";
import { theme } from "../components/theme";

const PRICE_RANGES = [
  { label: "All Prices", min: 0, max: 999 },
  { label: "Budget ($0-75)", min: 0, max: 75 },
  { label: "Mid-Range ($75-150)", min: 75, max: 150 },
  { label: "Premium ($150+)", min: 150, max: 999 },
] as const;

const RATING_FILTERS = [
  { label: "All Ratings", value: 0 },
  { label: "4.0+", value: 4.0 },
  { label: "4.5+", value: 4.5 },
  { label: "4.8+", value: 4.8 },
] as const;

const DEFAULT_VIEW_ALL_SCROLL_OFFSET = 20;

type LocationState = "idle" | "loading" | "ready" | "fallback";
type LocationNoticeKind = "none" | "permissionDenied" | "permissionBlocked" | "servicesDisabled" | "error";
type CourseWithMetrics = ReturnType<typeof buildCoursesWithMetrics>[number];
type DisplayedCourse = CourseWithMetrics & { distanceKm: number };

function buildCoursesWithMetrics(courses: ReturnType<typeof useCourseCatalog>["courses"]) {
  return courses.map((course) => ({
    ...course,
    priceNum: Number.parseInt(course.price.replace(/[^0-9]/g, ""), 10),
    ratingNum: Number.parseFloat(course.rating),
  }));
}

const DEFAULT_LOCATION_LABEL = "Showing courses near Colombo. Tap Use My Location for nearby results.";
const LOCATION_ERROR_LABEL = "Could not get your current location, so courses are shown near Colombo.";
const LOCATION_ERROR_NOTICE = {
  kind: "error" as const,
  title: "Couldn't find your location",
  body: "Check signal or move to a clearer area, then tap Retry.",
};

export default function ExploreScreen() {
  const router = useRouter();
  const courseCatalog = useCourseCatalog();
  const { section, scrollOffset } = useLocalSearchParams<{ section?: string; scrollOffset?: string }>();
  const scrollRef = useRef<FlatList<DisplayedCourse>>(null);
  const webViewRef = useRef<WebView>(null);
  const hasAutoScrolled = useRef(false);
  const locationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [horizontalScrollStartY, setHorizontalScrollStartY] = useState<number | null>(null);
  const [activeStyle, setActiveStyle] = useState<"ALL" | CourseStyle>("ALL");
  const [selectedPriceRange, setSelectedPriceRange] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState(DEFAULT_USER_LOCATION);
  const [locationLabel, setLocationLabel] = useState(DEFAULT_LOCATION_LABEL);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [locationNotice, setLocationNotice] = useState<{
    kind: LocationNoticeKind;
    title: string;
    body: string;
  }>({
    kind: "none",
    title: "",
    body: "",
  });
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [showInteractiveMap, setShowInteractiveMap] = useState(false);
  const hasCenteredOnUser = useRef(false);
  const showInteractiveMapRef = useRef(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const parsedScrollOffset = Number(scrollOffset);
  const resolvedScrollOffset = Number.isFinite(parsedScrollOffset) && parsedScrollOffset > 0
    ? parsedScrollOffset
    : DEFAULT_VIEW_ALL_SCROLL_OFFSET;
  const coursesWithMetrics = useMemo(() => buildCoursesWithMetrics(courseCatalog.courses), [courseCatalog.courses]);
  const openCourseDetails = useCallback(
    (courseId: string) => {
      router.push({ pathname: "/course-details", params: { id: courseId } });
    },
    [router]
  );

  useEffect(() => {
    showInteractiveMapRef.current = showInteractiveMap;
  }, [showInteractiveMap]);

  useEffect(() => {
    if (section !== "all-courses" || hasAutoScrolled.current || horizontalScrollStartY === null) {
      return;
    }

    hasAutoScrolled.current = true;
    scrollRef.current?.scrollToOffset({
      offset: Math.max(horizontalScrollStartY - resolvedScrollOffset, 0),
      animated: true,
    });
  }, [horizontalScrollStartY, resolvedScrollOffset, section]);

  useEffect(() => {
    let active = true;
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      if (active) {
        setShowInteractiveMap(true);
      }
    });

    return () => {
      active = false;
      interactionTask.cancel();
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }
    };
  }, []);

  const applyResolvedUserLocation = (
    coordinates: { latitude: number; longitude: number },
    nextLabel = "Showing courses nearest to your current location"
  ) => {
    setUserLocation(coordinates);
    setLocationLabel(nextLabel);
    setLocationState("ready");
    setLocationNotice({ kind: "none", title: "", body: "" });
    setSelectedCourseId(null);

    if (showInteractiveMapRef.current && webViewRef.current) {
      const js = `updateUserLocation(${coordinates.latitude}, ${coordinates.longitude});`;
      webViewRef.current.injectJavaScript(js);
      hasCenteredOnUser.current = true;
    }
  };

  const applyLocationFailureFallback = () => {
    setLocationState("fallback");
    setLocationLabel(LOCATION_ERROR_LABEL);
    setLocationNotice(LOCATION_ERROR_NOTICE);
  };

  const requestUserLocation = async () => {
    if (locationState === "loading") {
      return;
    }

    hasCenteredOnUser.current = false;
    setLocationState("loading");
    setLocationNotice({ kind: "none", title: "", body: "" });
    setLocationLabel("Requesting location access...");

    if (locationTimeoutRef.current) {
      clearTimeout(locationTimeoutRef.current);
      locationTimeoutRef.current = null;
    }

    try {
      let permission = await Location.getForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== "granted") {
        setLocationState("fallback");
        setLocationLabel(DEFAULT_LOCATION_LABEL);
        setLocationNotice(
          permission.canAskAgain
            ? {
                kind: "permissionDenied",
                title: "Allow location access",
                body: "We use your location only to center the map and sort nearby courses.",
              }
            : {
                kind: "permissionBlocked",
                title: "Location permission is blocked",
                body: "Enable location for GolfTee in app settings, then come back and try again.",
              }
        );
        return;
      }

      if (Platform.OS === "android") {
        setLocationLabel("Turning on device location...");
        try {
          await Location.enableNetworkProviderAsync();
        } catch {
          // Keep going and verify provider status below.
        }
      }

      setLocationLabel("Finding your current location...");

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationState("fallback");
        setLocationLabel(DEFAULT_LOCATION_LABEL);
        setLocationNotice({
          kind: "servicesDisabled",
          title: "Turn on device location",
          body:
            Platform.OS === "android"
              ? "Allow your phone's location service or high-accuracy mode, then tap Retry."
              : "Turn on Location Services on your device, then tap Retry.",
        });
        return;
      }

      const recentPosition = await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60 * 1000,
        requiredAccuracy: 200,
      });

      if (recentPosition) {
        applyResolvedUserLocation(
          {
            latitude: recentPosition.coords.latitude,
            longitude: recentPosition.coords.longitude,
          },
          "Using your recent device location while we refresh it."
        );
      }

      const currentPositionResult = await Promise.race<
        | { type: "position"; value: Awaited<ReturnType<typeof Location.getCurrentPositionAsync>> }
        | { type: "error" }
        | { type: "timeout" }
      >([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          mayShowUserSettingsDialog: true,
        }).then(
          (value) => ({ type: "position" as const, value }),
          () => ({ type: "error" as const })
        ),
        new Promise<{ type: "timeout" }>((resolve) => {
          locationTimeoutRef.current = setTimeout(() => resolve({ type: "timeout" }), 7000);
        }),
      ]);

      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }

      if (currentPositionResult.type === "position") {
        applyResolvedUserLocation({
          latitude: currentPositionResult.value.coords.latitude,
          longitude: currentPositionResult.value.coords.longitude,
        });
        return;
      }

      if (recentPosition) {
        setLocationState("ready");
        setLocationLabel("Using your recent device location.");
        setLocationNotice({ kind: "none", title: "", body: "" });
        return;
      }

      applyLocationFailureFallback();
    } catch {
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }
      applyLocationFailureFallback();
    }
  };

  const handleLocationNoticePrimaryAction = () => {
    if (locationNotice.kind === "permissionBlocked") {
      void Linking.openSettings().catch(() => {
        setLocationNotice({
          kind: "error",
          title: "Could not open app settings",
          body: "Please open your device settings manually and enable location for GolfTee.",
        });
      });
      return;
    }

    void requestUserLocation();
  };

  useEffect(() => {
    if (!showInteractiveMap || locationState !== "ready" || hasCenteredOnUser.current) {
      return;
    }

    if (webViewRef.current) {
      const js = `updateUserLocation(${userLocation.latitude}, ${userLocation.longitude});`;
      webViewRef.current.injectJavaScript(js);
      hasCenteredOnUser.current = true;
    }
  }, [locationState, showInteractiveMap, userLocation]);

  const handlePriceRangeChange = (idx: number) => {
    setSelectedPriceRange(idx);
  };

  const handleRatingChange = (value: number) => {
    setSelectedRating(value);
  };

  const handleStyleChange = (style: "ALL" | CourseStyle) => {
    setActiveStyle(style);
  };

  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const activePriceRange = PRICE_RANGES[selectedPriceRange];

  const displayedCourses = useMemo(() => {
    return coursesWithMetrics.filter((course) => {
      const styleMatch = activeStyle === "ALL" || course.style === activeStyle;
      const priceMatch = course.priceNum >= activePriceRange.min && course.priceNum <= activePriceRange.max;
      const ratingMatch = course.ratingNum >= selectedRating;
      const searchMatch =
        normalizedSearchQuery.length === 0 ||
        course.title.toLowerCase().includes(normalizedSearchQuery) ||
        course.location.toLowerCase().includes(normalizedSearchQuery);

      return styleMatch && priceMatch && ratingMatch && searchMatch;
    });
  }, [activePriceRange.max, activePriceRange.min, activeStyle, coursesWithMetrics, normalizedSearchQuery, selectedRating]);

  const displayedCoursesWithDistance = useMemo<DisplayedCourse[]>(() => {
    return displayedCourses
      .map((course) => ({
        ...course,
        distanceKm: calculateDistanceKm(userLocation, course.coordinates),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [displayedCourses, userLocation]);

  const nearbyCourses = useMemo(
    () => displayedCoursesWithDistance.filter((course) => course.distanceKm <= 100),
    [displayedCoursesWithDistance]
  );

  const nearestCourses = useMemo(() => nearbyCourses.slice(0, 5), [nearbyCourses]);

  const displayedCoursesById = useMemo(
    () => new Map(displayedCoursesWithDistance.map((course) => [course.id, course])),
    [displayedCoursesWithDistance]
  );

  const selectedCourse = selectedCourseId ? displayedCoursesById.get(selectedCourseId) ?? null : null;

  useEffect(() => {
    if (selectedCourseId && !displayedCoursesWithDistance.some((course) => course.id === selectedCourseId)) {
      setSelectedCourseId(null);
    }
  }, [displayedCoursesWithDistance, selectedCourseId]);

  const focusCourseOnMap = useCallback((courseId: string) => {
    const course = displayedCoursesById.get(courseId);
    if (!course) {
      return;
    }

    setViewMode("map");
    setSelectedCourseId(course.id);
    
    setTimeout(() => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`selectMarker("${course.id}", ${course.coordinates.latitude}, ${course.coordinates.longitude});`);
      }
    }, 200);
  }, [displayedCoursesById]);

  const renderCourseItem = useCallback(
    ({ item: course }: { item: DisplayedCourse }) => (
      <View style={styles.courseCardItem}>
        <CourseCard
          variant="featured"
          title={course.title}
          location={`${course.location} - ${course.distanceKm.toFixed(0)} km`}
          image={course.image}
          price={course.price}
          rating={course.rating}
          styleLabel={course.style}
          cardStyle={styles.courseCard}
          onPress={() => openCourseDetails(course.id)}
        />
      </View>
    ),
    [openCourseDetails]
  );

  // Update selected marker in WebView when selectedCourseId changes from list interaction
  useEffect(() => {
    if (selectedCourseId && webViewRef.current) {
      const course = displayedCoursesById.get(selectedCourseId);
      if (course) {
        const js = `selectMarker("${course.id}", ${course.coordinates.latitude}, ${course.coordinates.longitude});`;
        webViewRef.current.injectJavaScript(js);
      }
    }
  }, [selectedCourseId, displayedCoursesById]);

  // Update user location marker in WebView when it resolves
  useEffect(() => {
    if (webViewRef.current && locationState === "ready") {
      const js = `updateUserLocation(${userLocation.latitude}, ${userLocation.longitude});`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [userLocation, locationState]);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_COURSE') {
        setSelectedCourseId(data.courseId);
      } else if (data.type === 'VIEW_DETAILS') {
        openCourseDetails(data.courseId);
      } else if (data.type === 'DESELECT_COURSE') {
        setSelectedCourseId(null);
      }
    } catch (err) {
      console.warn("WebView message parse failed", err);
    }
  };

  const leafletHtml = useMemo(() => {
    const coursesJson = JSON.stringify(
      displayedCoursesWithDistance.map((c) => ({
        id: c.id,
        title: c.title,
        location: c.location,
        lat: c.coordinates.latitude,
        lng: c.coordinates.longitude,
        distanceKm: c.distanceKm,
      }))
    );

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; background-color: #EDF4F0; }
    #map { height: 100vh; width: 100vw; }
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      padding: 6px;
      border: 1px solid #102B22;
    }
    .popup-title {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #12392D;
      margin: 0 0 4px 0;
    }
    .popup-text {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      color: #5F6A63;
      margin: 0 0 8px 0;
    }
    .popup-link {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: #C79A4B;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([7.8731, 80.7718], 7.5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var greenIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    var goldIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    var blueIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    var courses = ${coursesJson};
    var markers = {};
    var userMarker = null;
    var selectedCourseId = ${selectedCourseId ? `"${selectedCourseId}"` : "null"};

    courses.forEach(function(course) {
      var isSelected = course.id === selectedCourseId;
      var icon = isSelected ? goldIcon : greenIcon;
      
      var popupContent = '<div class="popup-content">' +
        '<h3 class="popup-title">' + course.title + '</h3>' +
        '<p class="popup-text">' + course.location + ' - ' + Math.round(course.distanceKm) + ' km away</p>' +
        '<a href="javascript:void(0)" class="popup-link" onclick="handlePopupClick(\\'' + course.id + '\\')">View Details →</a>' +
        '</div>';

      var marker = L.marker([course.lat, course.lng], { icon: icon })
        .addTo(map)
        .bindPopup(popupContent);
        
      marker.on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_COURSE', courseId: course.id }));
      });
      
      markers[course.id] = marker;
      
      if (isSelected) {
        setTimeout(function() {
          marker.openPopup();
          map.setView([course.lat, course.lng], 9);
        }, 100);
      }
    });

    function handlePopupClick(courseId) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'VIEW_DETAILS', courseId: courseId }));
    }

    function selectMarker(id, lat, lng) {
      for (var key in markers) {
        markers[key].setIcon(greenIcon);
      }
      if (markers[id]) {
        markers[id].setIcon(goldIcon);
        markers[id].openPopup();
      }
      map.panTo([lat, lng]);
    }

    function updateUserLocation(lat, lng) {
      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
      } else {
        userMarker = L.marker([lat, lng], { icon: blueIcon }).addTo(map)
          .bindPopup('<b style="font-family: sans-serif; font-size:12px; color:#12392D;">Your Location</b>');
      }
      map.setView([lat, lng], 8.5);
    }
    
    if (${locationState === "ready" ? "true" : "false"}) {
      updateUserLocation(${userLocation.latitude}, ${userLocation.longitude});
    }

    map.on('click', function(e) {
      if (e.sourceTarget === map) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DESELECT_COURSE' }));
      }
    });
  </script>
</body>
</html>
    `;
  }, [displayedCoursesWithDistance, selectedCourseId, userLocation, locationState]);  const listViewHeader = (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        bounces={false}
        overScrollMode="never"
        onLayout={(event) => {
          setHorizontalScrollStartY(event.nativeEvent.layout.y);
        }}
      >
        <Pressable
          style={[styles.filterChip, activeStyle === "ALL" && styles.filterChipActive]}
          onPress={() => handleStyleChange("ALL")}
          variant="chip"
        >
          <Text style={[styles.filterChipText, activeStyle === "ALL" && styles.filterChipTextActive]}>All Courses</Text>
        </Pressable>
        {STYLE_OPTIONS.map((style) => (
          <Pressable
            key={style}
            style={[styles.filterChip, activeStyle === style && styles.filterChipActive]}
            onPress={() => handleStyleChange(style)}
            variant="chip"
          >
            <Text style={[styles.filterChipText, activeStyle === style && styles.filterChipTextActive]}>
              {style.charAt(0) + style.slice(1).toLowerCase()}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.sectionSeparator} />

      <View style={styles.trendingSection}>
        <View style={styles.trendingHeader}>
          <View>
            <Text style={styles.trendingTitle}>Explore Nearby</Text>
            <Text style={styles.trendingSubtitle}>Courses within 100 km of your current location.</Text>
          </View>
        </View>

        {nearestCourses.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingList}
            bounces={false}
            overScrollMode="never"
          >
            {nearestCourses.map((course) => (
              <CourseCard
                key={course.id}
                variant="compact"
                size="small"
                title={course.title}
                location={`${course.location} - ${course.distanceKm.toFixed(0)} km`}
                image={course.image}
                price={course.price}
                rating={course.rating}
                styleLabel={course.style}
                tone={course.style === "COASTAL" ? "green" : "gold"}
                cardStyle={styles.trendingCard}
                compactActionLabel="View Details"
                onPressCompactAction={() => openCourseDetails(course.id)}
                onPress={() => focusCourseOnMap(course.id)}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyNearbyState}>
            <Text style={styles.emptyNearbyTitle}>No courses found within 100 km</Text>
            <Text style={styles.emptyNearbyText}>Turn on location or adjust the filters to see more courses across Sri Lanka.</Text>
          </View>
        )}
      </View>

      <View style={styles.sectionSeparator} />
    </>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <StatusBar style="dark" />

      {/* Sticky Header with Search and Toggle */}
      <View style={styles.topStickyHeader}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={theme.colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses, location, or style"
            placeholderTextColor={theme.colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <Pressable style={styles.clearSearchButton} onPress={() => setSearchQuery("")} variant="icon">
              <Ionicons name="close-circle" size={16} color={theme.colors.muted} />
            </Pressable>
          ) : null}
          <Pressable style={styles.tuneButton} onPress={() => setShowFilterDropdown((prev) => !prev)} variant="icon">
            <Ionicons name="options" size={18} color={theme.colors.primary} />
          </Pressable>
        </View>

        {showFilterDropdown ? (
          <View style={styles.dropdownContainer}>
            <View>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Price Range</Text>
              </View>
              {PRICE_RANGES.map((range, idx) => (
                <Pressable
                  key={`price-${idx}`}
                  style={[styles.dropdownItem, selectedPriceRange === idx && styles.dropdownItemActive]}
                  onPress={() => handlePriceRangeChange(idx)}
                  variant="chip"
                >
                  <Text style={[styles.dropdownItemText, selectedPriceRange === idx && styles.dropdownItemTextActive]}>
                    {range.label}
                  </Text>
                  {selectedPriceRange === idx ? <Ionicons name="checkmark" size={16} color={theme.colors.primary} /> : null}
                </Pressable>
              ))}
            </View>

            <View style={styles.dropdownDivider} />

            <View>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Minimum Rating</Text>
              </View>
              {RATING_FILTERS.map((rating) => (
                <Pressable
                  key={`rating-${rating.value}`}
                  style={[styles.dropdownItem, selectedRating === rating.value && styles.dropdownItemActive]}
                  onPress={() => handleRatingChange(rating.value)}
                  variant="chip"
                >
                  <Text style={[styles.dropdownItemText, selectedRating === rating.value && styles.dropdownItemTextActive]}>
                    {rating.label}
                  </Text>
                  {selectedRating === rating.value ? <Ionicons name="checkmark" size={16} color={theme.colors.primary} /> : null}
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.dropdownCloseButton} onPress={() => setShowFilterDropdown(false)} variant="button">
              <Text style={styles.dropdownCloseButtonText}>Done</Text>
            </Pressable>
          </View>
        ) : null}

        {/* View Mode Toggle Switch */}
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
            onPress={() => setViewMode("list")}
            variant="chip"
          >
            <Ionicons name="list" size={16} color={viewMode === "list" ? theme.colors.surface : theme.colors.primary} />
            <Text style={[styles.toggleBtnText, viewMode === "list" && styles.toggleBtnTextActive]}>List View</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, viewMode === "map" && styles.toggleBtnActive]}
            onPress={() => setViewMode("map")}
            variant="chip"
          >
            <Ionicons name="map" size={16} color={viewMode === "map" ? theme.colors.surface : theme.colors.primary} />
            <Text style={[styles.toggleBtnText, viewMode === "map" && styles.toggleBtnTextActive]}>Map View</Text>
          </Pressable>
        </View>
      </View>

      {/* Conditional View Rendering */}
      {viewMode === "list" ? (
        <FlatList
          ref={scrollRef}
          data={displayedCoursesWithDistance}
          renderItem={renderCourseItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={listViewHeader}
          ListEmptyComponent={
            <View style={styles.emptyCoursesState}>
              <Text style={styles.emptyCoursesTitle}>No courses match your filters</Text>
              <Text style={styles.emptyCoursesText}>Try widening the price range, lowering the rating filter, or clearing search.</Text>
            </View>
          }
          ListFooterComponent={<View style={styles.listFooterSpacer} />}
        />
      ) : (
        <View style={styles.mapContainer}>
          <View style={styles.mapViewWrapper}>
            {showInteractiveMap ? (
              <WebView
                ref={webViewRef}
                style={styles.map}
                source={{ html: leafletHtml }}
                onMessage={handleWebViewMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                originWhitelist={['*']}
                scalesPageToFit={true}
              />
            ) : (
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map-outline" size={24} color={theme.colors.muted} />
                <Text style={styles.mapPlaceholderTitle}>Loading map...</Text>
                <Text style={styles.mapPlaceholderText}>Course results are ready. Interactive map follows right after the screen settles.</Text>
              </View>
            )}
          </View>

          {/* Floating Map Header */}
          <View style={styles.mapViewHeaderFloating}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mapViewTitle}>Sri Lanka Course Map</Text>
              <Text style={styles.mapViewSubtitle} numberOfLines={1}>{locationLabel}</Text>
            </View>
            <View style={styles.mapViewBadge}>
              <Ionicons name="location" size={12} color={theme.colors.primary} />
              <Text style={styles.mapViewBadgeText}>{displayedCoursesWithDistance.length} pins</Text>
            </View>
          </View>

          {/* Floating Location Trigger */}
          <Pressable
            style={[
              styles.useLocationButtonFloating,
              locationState === "loading" && styles.useLocationButtonDisabled,
              { bottom: selectedCourse ? 244 : 96 }
            ]}
            onPress={() => void requestUserLocation()}
            disabled={locationState === "loading"}
            variant="button"
          >
            <Ionicons
              name={locationState === "ready" ? "locate" : "locate-outline"}
              size={20}
              color={theme.colors.primary}
            />
          </Pressable>

          {/* Floating Bottom Overlays Container */}
          <View style={styles.floatingBottomContainer}>
            {locationNotice.kind !== "none" ? (
              <View style={[styles.locationNoticeCard, { position: "relative" }]}>
                <View style={[styles.locationNoticeHeader, { paddingRight: 24 }]}>
                  <View style={styles.locationNoticeIconWrap}>
                    <Ionicons
                      name={locationNotice.kind === "permissionBlocked" ? "settings-outline" : "locate-outline"}
                      size={16}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.locationNoticeCopy}>
                    <Text style={styles.locationNoticeTitle}>{locationNotice.title}</Text>
                    <Text style={styles.locationNoticeBody}>{locationNotice.body}</Text>
                  </View>
                </View>
                <Pressable style={styles.locationNoticeAction} onPress={handleLocationNoticePrimaryAction} variant="chip">
                  <Text style={styles.locationNoticeActionText}>
                    {locationNotice.kind === "permissionBlocked" ? "Open Settings" : "Retry"}
                  </Text>
                </Pressable>
                {/* Close Button */}
                <Pressable
                  style={styles.closeCardButton}
                  onPress={() => setLocationNotice({ kind: "none", title: "", body: "" })}
                  variant="icon"
                >
                  <Ionicons name="close" size={18} color={theme.colors.text} />
                </Pressable>
              </View>
            ) : null}

            {selectedCourse ? (
              <View style={styles.floatingCourseCard}>
                <Pressable
                  style={styles.selectedCourseCardFloating}
                  onPress={() => openCourseDetails(selectedCourse.id)}
                  variant="card"
                >
                  <View style={styles.selectedCourseCopy}>
                    <Text style={styles.selectedCourseLabel}>SELECTED COURSE</Text>
                    <Text style={styles.selectedCourseTitle} numberOfLines={1}>{selectedCourse.title}</Text>
                    <Text style={styles.selectedCourseMeta} numberOfLines={1}>
                      {selectedCourse.location} - {selectedCourse.distanceKm.toFixed(0)} km away
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
                </Pressable>

                {/* Close Button */}
                <Pressable
                  style={styles.closeCardButton}
                  onPress={() => setSelectedCourseId(null)}
                  variant="icon"
                >
                  <Ionicons name="close" size={18} color={theme.colors.text} />
                </Pressable>

                <Pressable
                  style={styles.openMapButtonFloating}
                  onPress={() =>
                    openInGoogleMaps({
                      coordinates: selectedCourse.coordinates,
                      placeQuery: selectedCourse.placeQuery,
                      placeId: selectedCourse.placeId,
                    })
                  }
                  variant="cta"
                >
                  <Ionicons name="navigate-outline" size={16} color={theme.colors.surface} />
                  <Text style={styles.openMapButtonTextFloating}>Open in Google Maps</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.page,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 160,
  },
  heroSearchWrap: {
    paddingTop: 12,
    paddingBottom: 10,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
  },
  clearSearchButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  tuneButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    paddingLeft: 8,
  },
  filterRow: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: theme.colors.page,
  },
  filterChip: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "600",
    color: theme.colors.textSoft,
  },
  filterChipTextActive: {
    color: theme.colors.surface,
  },
  courseCardItem: {
    marginBottom: 16,
  },
  courseCard: {
    width: "100%",
  },
  trendingSection: {
    marginTop: 4,
    marginBottom: 8,
  },
  trendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  trendingTitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "700",
    color: theme.colors.text,
  },
  trendingSubtitle: {
    marginTop: 3,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
  },
  trendingList: {
    gap: 10,
    paddingLeft: 2,
    paddingVertical: 4,
    paddingRight: 2,
  },
  emptyNearbyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyNearbyTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  emptyNearbyText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
    textAlign: "center",
    maxWidth: 280,
  },
  trendingCard: {},
  sectionSeparator: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    height: 1,
    backgroundColor: theme.colors.borderStrong,
  },
  mapSection: {
    marginBottom: 8,
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  mapTitle: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  mapSubtitle: {
    marginTop: 3,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
    maxWidth: 240,
  },
  mapBadge: {
    height: 34,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mapBadgeText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  mapCard: {
    height: 300,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  useLocationButton: {
    marginTop: 12,
    minHeight: 40,
    alignSelf: "center",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 156,
  },
  useLocationButtonDisabled: {
    opacity: 0.72,
  },
  useLocationButtonText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.surface,
    fontWeight: "700",
  },
  locationNoticeCard: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 14,
    gap: 12,
  },
  locationNoticeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  locationNoticeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  locationNoticeCopy: {
    flex: 1,
  },
  locationNoticeTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
    marginBottom: 2,
  },
  locationNoticeBody: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
  },
  locationNoticeAction: {
    alignSelf: "flex-start",
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  locationNoticeActionText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 24,
    gap: 8,
  },
  mapPlaceholderTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  mapPlaceholderText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
    textAlign: "center",
    maxWidth: 260,
  },
  callout: {
    width: 170,
    paddingVertical: 2,
  },
  calloutTitle: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: 2,
  },
  calloutText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
  },
  selectedCourseCard: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectedCourseCopy: {
    flex: 1,
  },
  selectedCourseLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.accentWarm,
    letterSpacing: 1.1,
    fontWeight: "700",
    marginBottom: 4,
  },
  selectedCourseTitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
    marginBottom: 3,
  },
  selectedCourseMeta: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
  },
  openMapButton: {
    marginTop: 10,
    height: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  openMapButtonText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.surface,
    fontWeight: "700",
  },
  emptyCoursesState: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyCoursesTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  emptyCoursesText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
    textAlign: "center",
    maxWidth: 280,
  },
  listFooterSpacer: {
    height: 24,
  },
  
  // Dropdown Styles
  dropdownContainer: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dropdownHeader: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 4,
  },
  dropdownTitle: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 6,
  },
  dropdownItemActive: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dropdownItemText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textSoft,
    fontWeight: "500",
  },
  dropdownItemTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  },
  dropdownCloseButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  dropdownCloseButtonText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "600",
    color: theme.colors.surface,
  },
  topStickyHeader: {
    backgroundColor: theme.colors.page,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSoft,
    zIndex: 10,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.pill,
    padding: 4,
    marginTop: 10,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: theme.radius.pill,
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleBtnText: {
    fontSize: theme.typography.bodySm.fontSize,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  toggleBtnTextActive: {
    color: theme.colors.surface,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: theme.colors.page,
  },
  mapViewHeaderFloating: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 10,
  },
  mapViewTitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  mapViewSubtitle: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
    marginTop: 2,
  },
  mapViewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
  },
  mapViewBadgeText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  mapViewWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surfaceSoft,
  },
  useLocationButtonFloating: {
    position: "absolute",
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    zIndex: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  floatingBottomContainer: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 84, // Kept above bottom navigation bar
    gap: 10,
    zIndex: 10,
  },
  floatingCourseCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    position: "relative",
  },
  selectedCourseCardFloating: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    paddingRight: 16,
    marginBottom: 12,
  },
  closeCardButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  openMapButtonFloating: {
    height: 42,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  openMapButtonTextFloating: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.surface,
    fontWeight: "700",
  },
});
