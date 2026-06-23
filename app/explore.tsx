import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, InteractionManager, Linking, Platform, ScrollView, Text, TextInput, View, TouchableWithoutFeedback, Animated, BackHandler } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { CourseCard } from "../components/course-card";
import {
    calculateDistanceKm,
    CourseStyle,
    STYLE_OPTIONS,
    getCachedUserLocation,
    setCachedUserLocation,
} from "../services/course-data";
import { useCourseCatalog } from "../services/course-management";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "../components/theme";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

const PRICE_RANGES = [
  { label: "All Prices", min: 0, max: 999 },
  { label: "Budget ($0-75)", min: 0, max: 75 },
  { label: "Mid-Range ($75-150)", min: 75, max: 150 },
  { label: "Premium ($150+)", min: 150, max: 999 },
] as const;

const RATING_FILTERS = [
  { label: "All Ratings", value: 0 },
  { label: "3.5+", value: 3.5 },
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

const DEFAULT_LOCATION_LABEL = "Enable location access to show nearby golf courses.";
const LOCATION_ERROR_LABEL = "Could not get your current location. Please enable location services.";
const LOCATION_ERROR_NOTICE = {
  kind: "error" as const,
  title: "Couldn't find your location",
  body: "Check signal or move to a clearer area, then tap Retry.",
};

export default function ExploreScreen() {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const router = useRouter();
  const courseCatalog = useCourseCatalog();
  const { isTabletLike, horizontalPadding, isCompact } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  
  // Calculate dynamic bottom positioning relative to the SafeAreaView container
  const navHeight = isCompact ? 62 : 68;
  const navBottom = Math.max(insets.bottom + 6, 8);
  const bottomOverlayPosition = isTabletLike ? 44 : (navBottom + navHeight) - insets.bottom + 8;
  const { section, scrollOffset, view, courseId } = useLocalSearchParams<{
    section?: string;
    scrollOffset?: string;
    view?: "list" | "map";
    courseId?: string;
  }>();
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  const injectJS = (js: string) => {
    if (Platform.OS === 'web') {
      const iframe = document.getElementById('map-iframe') as HTMLIFrameElement | null;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'injectJavaScript', code: js }, '*');
      }
    } else {
      webViewRef.current?.injectJavaScript(js);
    }
  };



  const openFilterModal = () => {
    setShowFilterDropdown(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 12,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeFilterModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowFilterDropdown(false);
    });
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(getCachedUserLocation());
  const [locationLabel, setLocationLabel] = useState(getCachedUserLocation() ? "Showing courses nearest to your current location" : DEFAULT_LOCATION_LABEL);
  const [locationState, setLocationState] = useState<LocationState>(getCachedUserLocation() ? "ready" : "idle");
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
  const isLocationLoadingRef = useRef(false);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const locationNoticeAnim = useRef(new Animated.Value(0)).current;
  const [activeLocationNotice, setActiveLocationNotice] = useState<typeof locationNotice | null>(null);
  const [showInteractiveMap, setShowInteractiveMap] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
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
      router.navigate({ pathname: "/course-details", params: { id: courseId } });
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

  const applyResolvedUserLocation = useCallback((
    coordinates: { latitude: number; longitude: number },
    nextLabel = "Showing courses nearest to your current location"
  ) => {
    setUserLocation(coordinates);
    setCachedUserLocation(coordinates);
    setLocationLabel(nextLabel);
    setLocationState("ready");
    setLocationNotice({ kind: "none", title: "", body: "" });
    setSelectedCourseId(null);

    if (showInteractiveMapRef.current && (Platform.OS === 'web' || webViewRef.current)) {
      const js = `updateUserLocation(${coordinates.latitude}, ${coordinates.longitude}, true);`;
      injectJS(js);
      hasCenteredOnUser.current = true;
    }
  }, []);

  const applyLocationFailureFallback = useCallback(() => {
    setLocationState("fallback");
    setCachedUserLocation(null);
    setLocationLabel(LOCATION_ERROR_LABEL);
    setLocationNotice(LOCATION_ERROR_NOTICE);
  }, []);

  const requestUserLocation = useCallback(async () => {
    if (isLocationLoadingRef.current) {
      return;
    }

    isLocationLoadingRef.current = true;
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
    } finally {
      isLocationLoadingRef.current = false;
    }
  }, [applyResolvedUserLocation, applyLocationFailureFallback]);

  const fetchLocationSilently = useCallback(async () => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) return;

      const recentPosition = await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60 * 1000,
        requiredAccuracy: 200,
      });

      if (recentPosition) {
        const coords = {
          latitude: recentPosition.coords.latitude,
          longitude: recentPosition.coords.longitude,
        };
        setUserLocation(coords);
        setCachedUserLocation(coords);
        if (showInteractiveMapRef.current && (Platform.OS === 'web' || webViewRef.current)) {
          injectJS(`updateUserLocation(${coords.latitude}, ${coords.longitude}, false);`);
        }
      }

      const currentPositionResult = await Promise.race<
        | { type: "position"; value: Awaited<ReturnType<typeof Location.getCurrentPositionAsync>> }
        | { type: "error" }
        | { type: "timeout" }
      >([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: false,
        }).then(
          (value) => ({ type: "position" as const, value }),
          () => ({ type: "error" as const })
        ),
        new Promise<{ type: "timeout" }>((resolve) => {
          locationTimeoutRef.current = setTimeout(() => resolve({ type: "timeout" }), 5000);
        }),
      ]);

      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }

      if (currentPositionResult.type === "position") {
        const coords = {
          latitude: currentPositionResult.value.coords.latitude,
          longitude: currentPositionResult.value.coords.longitude,
        };
        setUserLocation(coords);
        setCachedUserLocation(coords);
        if (showInteractiveMapRef.current && (Platform.OS === 'web' || webViewRef.current)) {
          injectJS(`updateUserLocation(${coords.latitude}, ${coords.longitude}, false);`);
        }
      }
    } catch (e) {
      console.warn("Silent location fetch failed", e);
    }
  }, []);

  useEffect(() => {
    const silentCheck = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          void fetchLocationSilently();
        }
      } catch (e) {
        console.warn("Silent location check failed", e);
      }
    };
    void silentCheck();
  }, [fetchLocationSilently]);

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
    if (!showInteractiveMap || locationState !== "ready" || hasCenteredOnUser.current || !userLocation) {
      return;
    }

    if (Platform.OS === 'web' || webViewRef.current) {
      const js = `updateUserLocation(${userLocation.latitude}, ${userLocation.longitude}, false);`;
      injectJS(js);
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

  const handleResetFilters = () => {
    setSelectedPriceRange(0);
    setSelectedRating(0);
    setActiveStyle("ALL");
    setSearchQuery("");
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
        distanceKm: userLocation ? calculateDistanceKm(userLocation, course.coordinates) : 0,
      }))
      .sort((a, b) => {
        if (!userLocation) {
          return a.title.localeCompare(b.title);
        }
        return a.distanceKm - b.distanceKm;
      });
  }, [displayedCourses, userLocation]);

  const nearbyCourses = useMemo(
    () => {
      if (!userLocation) return [];
      return displayedCoursesWithDistance.filter((course) => course.distanceKm <= 100);
    },
    [displayedCoursesWithDistance, userLocation]
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

  const [activeCardCourse, setActiveCardCourse] = useState<DisplayedCourse | null>(null);

  // Animate the bottom course card in/out
  useEffect(() => {
    if (selectedCourse) {
      setActiveCardCourse(selectedCourse);
      Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 16,
        bounciness: 7,
      }).start();
    } else {
      Animated.spring(cardAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 16,
        bounciness: 7,
      }).start(({ finished }) => {
        if (finished) {
          setActiveCardCourse(null);
        }
      });
    }
  }, [selectedCourse, cardAnim]);

  // Animate the location notice card in/out
  useEffect(() => {
    if (locationNotice.kind !== "none") {
      setActiveLocationNotice(locationNotice);
      Animated.spring(locationNoticeAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 16,
        bounciness: 7,
      }).start();
    } else {
      Animated.spring(locationNoticeAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 16,
        bounciness: 7,
      }).start(({ finished }) => {
        if (finished) {
          setActiveLocationNotice(null);
        }
      });
    }
  }, [locationNotice, locationNoticeAnim]);

  const centerSelectedCourse = useCallback(() => {
    if (selectedCourse && (Platform.OS === 'web' || webViewRef.current)) {
      injectJS(`selectMarker("${selectedCourse.id}", ${selectedCourse.coordinates.latitude}, ${selectedCourse.coordinates.longitude});`);
    }
  }, [selectedCourse]);

  const focusCourseOnMap = useCallback((courseId: string) => {
    const course = displayedCoursesById.get(courseId);
    if (!course) {
      return;
    }

    setViewMode("map");
    setSelectedCourseId(course.id);
    
    setTimeout(() => {
      if (Platform.OS === 'web' || webViewRef.current) {
        injectJS(`selectMarker("${course.id}", ${course.coordinates.latitude}, ${course.coordinates.longitude});`);
      }
    }, 200);
  }, [displayedCoursesById]);

  useEffect(() => {
    if (view === "map") {
      setViewMode("map");
      if (courseId && showInteractiveMap) {
        const timer = setTimeout(() => {
          focusCourseOnMap(courseId);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [view, courseId, showInteractiveMap, focusCourseOnMap]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const onBackPress = () => {
      if (viewMode === "map" && selectedCourseId !== null) {
        setSelectedCourseId(null);
        return true;
      }
      if (viewMode === "map") {
        setViewMode("list");
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [viewMode, selectedCourseId]);

  const renderCourseItem = useCallback(
    ({ item: course }: { item: DisplayedCourse }) => (
      <View style={styles.courseCardItem}>
        <CourseCard
          variant="featured"
          title={course.title}
          location={userLocation && locationState === "ready" ? `${course.location} - ${course.distanceKm.toFixed(0)} km` : course.location}
          image={course.image}
          price={course.price}
          rating={course.rating}
          styleLabel={course.style}
          cardStyle={styles.courseCard}
          onPress={() => openCourseDetails(course.id)}
        />
      </View>
    ),
    [openCourseDetails, styles.courseCard, styles.courseCardItem, userLocation, locationState]
  );

  // Reset map ready status when viewMode changes or interactive map is hidden
  useEffect(() => {
    if (viewMode !== "map" || !showInteractiveMap) {
      setIsMapReady(false);
    }
  }, [viewMode, showInteractiveMap]);

  // Update selected marker in WebView when selectedCourseId changes from list interaction
  useEffect(() => {
    if ((Platform.OS === 'web' || webViewRef.current) && isMapReady) {
      if (selectedCourseId) {
        const course = displayedCoursesById.get(selectedCourseId);
        if (course) {
          const js = `selectMarker("${course.id}", ${course.coordinates.latitude}, ${course.coordinates.longitude});`;
          injectJS(js);
        }
      } else {
        injectJS('deselectMarker();');
      }
    }
  }, [selectedCourseId, displayedCoursesById, isMapReady]);

  // Update user location marker in WebView when it resolves
  useEffect(() => {
    if ((Platform.OS === 'web' || webViewRef.current) && isMapReady && locationState === "ready" && userLocation) {
      const js = `updateUserLocation(${userLocation.latitude}, ${userLocation.longitude}, false);`;
      injectJS(js);
    }
  }, [userLocation, locationState, isMapReady]);

  // Update courses list in WebView when courses list or map readiness changes
  useEffect(() => {
    if ((Platform.OS === 'web' || webViewRef.current) && isMapReady) {
      const coursesPayload = displayedCoursesWithDistance.map((c) => ({
        id: c.id,
        title: c.title,
        location: c.location,
        lat: c.coordinates.latitude,
        lng: c.coordinates.longitude,
        distanceKm: c.distanceKm,
      }));
      const js = `updateCourses('${JSON.stringify(coursesPayload).replace(/'/g, "\\'")}', ${selectedCourseId ? `"${selectedCourseId}"` : "null"});`;
      injectJS(js);
    }
  }, [displayedCoursesWithDistance, isMapReady, selectedCourseId]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        setIsMapReady(true);
      } else if (data.type === 'SELECT_COURSE') {
        setSelectedCourseId(data.courseId);
      } else if (data.type === 'VIEW_DETAILS') {
        openCourseDetails(data.courseId);
      } else if (data.type === 'DESELECT_COURSE') {
        setSelectedCourseId(null);
      }
    } catch (err) {
      console.warn("WebView message parse failed", err);
    }
  }, [openCourseDetails]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleWebMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === 'string') {
          const parsed = JSON.parse(event.data);
          if (parsed && typeof parsed.type === 'string') {
            handleWebViewMessage({ nativeEvent: { data: event.data } });
          }
        }
      } catch {
        // Ignore non-JSON messages (webpack hot reloads, etc)
      }
    };

    window.addEventListener('message', handleWebMessage);
    return () => {
      window.removeEventListener('message', handleWebMessage);
    };
  }, [handleWebViewMessage]);

  const leafletHtml = useMemo(() => {
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
    /* Custom pin base */
    .golf-pin {
      width: 32px;
      height: 40px;
      position: relative;
    }
    .user-location-dot {
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: #2563EB;
      border: 3px solid rgba(255, 255, 255, 0.95);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var sendReactNativeMessage = function(msg) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      } else {
        window.parent.postMessage(JSON.stringify(msg), '*');
      }
    };

    window.addEventListener('message', function(event) {
      try {
        var msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (msg && msg.type === 'injectJavaScript') {
          eval(msg.code);
        }
      } catch (e) {
        // Ignore errors
      }
    });

    var map = L.map('map', { zoomControl: false }).setView([7.8731, 80.7718], 7.0);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // SVG-based custom golf pins — no external image dependency
    function makePinSVG(fill, stroke, flagFill) {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40">' +
        '<path d="M16 1C9.37 1 4 6.37 4 13c0 9 12 26 12 26s12-17 12-26C28 6.37 22.63 1 16 1z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.8"/>' +
        '<circle cx="16" cy="13" r="6" fill="' + flagFill + '"/>' +
        '</svg>';
    }

    function makeDivIcon(fill, stroke, flagFill, isSelected) {
      var svg = makePinSVG(fill, stroke, flagFill);
      var cls = 'golf-pin' + (isSelected ? ' selected' : '');
      var html = '<div class="' + cls + '" style="width:32px;height:40px;">' + svg + '</div>';
      return L.divIcon({
        html: html,
        className: '',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40]
      });
    }

    function makeUserLocationIcon() {
      return L.divIcon({
        html: '<div class="user-location-dot"></div>',
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -9]
      });
    }

    var greenIcon  = makeDivIcon('#2D7D4E', '#12392D', '#fff', false);
    var goldIcon   = makeDivIcon('#C79A4B', '#8B6512', '#fff', false);
    var blueIcon   = makeUserLocationIcon();

    var markers = {};
    var userMarker = null;
    var selectedCourseId = null;

    function handlePopupClick(courseId) {
      sendReactNativeMessage({ type: 'VIEW_DETAILS', courseId: courseId });
    }

    function selectMarker(id, lat, lng) {
      selectedCourseId = id;
      // Reset all pins to green
      for (var key in markers) {
        markers[key].setIcon(makeDivIcon('#2D7D4E', '#12392D', '#fff', false));
      }
      // Apply gold animation to selected pin
      if (markers[id]) {
        markers[id].setIcon(makeDivIcon('#C79A4B', '#8B6512', '#fff', true));
      }
      if (map.getZoom() < 9.5) {
        map.setView([lat, lng], 9.5);
      } else {
        map.panTo([lat, lng]);
      }
    }

    function deselectMarker() {
      selectedCourseId = null;
      for (var key in markers) {
        markers[key].setIcon(makeDivIcon('#2D7D4E', '#12392D', '#fff', false));
      }
    }

    function updateUserLocation(lat, lng, shouldCenter) {
      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
      } else {
        userMarker = L.marker([lat, lng], { icon: blueIcon }).addTo(map);
      }
      if (shouldCenter || !selectedCourseId) {
        map.setView([lat, lng], 8.5);
      }
    }

    function updateCourses(coursesJson, selectedId) {
      selectedCourseId = selectedId;
      var newCourses = JSON.parse(coursesJson);
      
      // Remove all existing markers
      for (var key in markers) {
        map.removeLayer(markers[key]);
      }
      markers = {};
      
      newCourses.forEach(function(course) {
        var isSelected = course.id === selectedCourseId;
        var icon = isSelected ? makeDivIcon('#C79A4B', '#8B6512', '#fff', true) : greenIcon;
        
        var marker = L.marker([course.lat, course.lng], { icon: icon })
          .addTo(map);
          
        marker.on('click', function() {
          sendReactNativeMessage({ type: 'SELECT_COURSE', courseId: course.id });
        });
        
        markers[course.id] = marker;
        
        if (isSelected) {
          setTimeout(function() {
            map.setView([course.lat, course.lng], 9.5);
          }, 100);
        }
      });
    }

    map.on('click', function(e) {
      if (e.sourceTarget === map) {
        selectedCourseId = null;
        sendReactNativeMessage({ type: 'DESELECT_COURSE' });
      }
    });

    // Notify React Native that the Leaflet script and map are ready
    sendReactNativeMessage({ type: 'MAP_READY' });
  </script>
</body>
</html>
    `;
  }, []);
  const renderMapView = () => (
    <View style={[styles.mapContainer, isTabletLike && { flex: 1, height: "100%" }]}>
      <View
        style={[
          styles.mapViewWrapper,
          isTabletLike && {
            left: horizontalPadding,
            right: horizontalPadding,
            top: 12,
            bottom: 24,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }
        ]}
      >
        {showInteractiveMap ? (
          Platform.OS === 'web' ? (
            <>
              <style dangerouslySetInnerHTML={{ __html: `
                #map-iframe {
                  width: 100%;
                  height: 100%;
                  border: none;
                }
              `}} />
              <iframe
                id="map-iframe"
                title="Interactive Course Map"
                srcDoc={leafletHtml}
              />
            </>
          ) : (
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
          )
        ) : (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={24} color={colors.muted} />
            <Text style={styles.mapPlaceholderTitle}>Loading map...</Text>
            <Text style={styles.mapPlaceholderText}>Course results are ready. Interactive map follows right after the screen settles.</Text>
          </View>
        )}
      </View>

      {/* Floating Map Header */}
      <View
        style={[
          styles.mapViewHeaderFloating,
          {
            left: isTabletLike ? horizontalPadding + 16 : horizontalPadding,
            right: isTabletLike ? horizontalPadding + 16 : horizontalPadding,
            top: isTabletLike ? 28 : 12,
          }
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.mapViewTitle}>Sri Lanka Course Map</Text>
          <Text style={styles.mapViewSubtitle} numberOfLines={1}>{locationLabel}</Text>
        </View>
        <View style={styles.mapViewBadge}>
          <Ionicons name="location" size={12} color={colors.primary} />
          <Text style={styles.mapViewBadgeText}>{displayedCoursesWithDistance.length} pins</Text>
        </View>
      </View>

      {/* Floating Bottom Overlays Container */}
      <View
        pointerEvents="box-none"
        style={[
          styles.floatingBottomContainer,
          {
            left: isTabletLike ? horizontalPadding + 20 : horizontalPadding,
            right: isTabletLike ? horizontalPadding + 20 : horizontalPadding,
            bottom: bottomOverlayPosition
          }
        ]}
      >
        {/* Floating Location Trigger */}
        <Pressable
          style={[
            styles.useLocationButtonFloating,
            locationState === "loading" && styles.useLocationButtonDisabled,
            {
              position: "relative",
              right: 0,
              bottom: 0,
              alignSelf: "flex-end",
            }
          ]}
          onPress={() => void requestUserLocation()}
          disabled={locationState === "loading"}
          variant="button"
          accessibilityRole="button"
          accessibilityLabel="Use my location"
          accessibilityHint="Centers map on your current location"
        >
          <Ionicons
            name={locationState === "ready" ? "locate" : "locate-outline"}
            size={20}
            color={colors.primary}
          />
        </Pressable>

        {activeLocationNotice ? (
          <Animated.View
            style={[
              styles.locationNoticeCard,
              {
                opacity: locationNoticeAnim,
                transform: [{
                  translateY: locationNoticeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0]
                  })
                }],
                pointerEvents: locationNotice.kind !== "none" ? 'auto' : 'none',
                position: "relative",
              },
            ]}
          >
            <View style={[styles.locationNoticeHeader, { paddingRight: 24 }]}>
              <View style={styles.locationNoticeIconWrap}>
                <Ionicons
                  name={activeLocationNotice.kind === "permissionBlocked" ? "settings-outline" : "locate-outline"}
                  size={16}
                  color={colors.primary}
                />
              </View>
              <View style={styles.locationNoticeCopy}>
                <Text style={styles.locationNoticeTitle}>{activeLocationNotice.title}</Text>
                <Text style={styles.locationNoticeBody}>{activeLocationNotice.body}</Text>
              </View>
            </View>
            <Pressable style={styles.locationNoticeAction} onPress={handleLocationNoticePrimaryAction} variant="chip">
              <Text style={styles.locationNoticeActionText}>
                {activeLocationNotice.kind === "permissionBlocked" ? "Open Settings" : "Retry"}
              </Text>
            </Pressable>
            {/* Close Button */}
            <Pressable
              style={styles.closeCardButton}
              onPress={() => setLocationNotice({ kind: "none", title: "", body: "" })}
              variant="icon"
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </Animated.View>
        ) : null}

        {activeCardCourse ? (
          <Animated.View
            style={[
              styles.floatingCourseCard,
              {
                opacity: cardAnim,
                transform: [{
                  translateY: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0]
                  })
                }],
                pointerEvents: selectedCourse ? 'auto' : 'none',
              },
            ]}
          >
            <Pressable
              style={styles.mapCardInner}
              onPress={centerSelectedCourse}
              variant="card"
            >
              {/* Top Row: Course Info & Dismiss */}
              <View style={styles.mapCardHeaderRow}>
                <View style={styles.mapCardInfo}>
                  <Text style={styles.selectedCourseLabel}>SELECTED COURSE</Text>
                  <Text style={styles.selectedCourseTitle} numberOfLines={1}>{activeCardCourse.title}</Text>
                  
                  <View style={styles.mapCardMetaRow}>
                    <View style={styles.mapCardMetaItem}>
                      <Ionicons name="location" size={12} color={colors.textSoft} />
                      <Text style={styles.mapCardMetaText} numberOfLines={1}>
                        {activeCardCourse.location} ({activeCardCourse.distanceKm.toFixed(0)} km)
                      </Text>
                    </View>
                    <View style={styles.mapCardMetaDivider} />
                    <View style={styles.mapCardMetaItem}>
                      <Ionicons name="star" size={12} color={colors.accentWarm} />
                      <Text style={styles.mapCardMetaText}>{activeCardCourse.rating}</Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  style={styles.mapCardCloseBtn}
                  onPress={() => setSelectedCourseId(null)}
                  variant="icon"
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
              </View>

              {/* Mid Row: Price and Actions */}
              <View style={styles.mapCardFooterRow}>
                <View style={styles.mapCardPriceBlock}>
                  <Text style={styles.mapCardPriceLabel}>STARTING AT</Text>
                  <Text style={styles.mapCardPriceVal}>{activeCardCourse.price}</Text>
                </View>

                <View style={styles.mapCardActions}>
                  <Pressable
                    style={[styles.mapCardBtn, styles.mapCardBtnSecondary]}
                    onPress={() => openCourseDetails(activeCardCourse.id)}
                    variant="chip"
                  >
                    <Text style={styles.mapCardBtnSecondaryText}>Details</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.mapCardBtn, styles.mapCardBtnPrimary]}
                    onPress={() => router.navigate({
                      pathname: "/tee-time-booking",
                      params: { id: activeCardCourse.id }
                    })}
                    variant="cta"
                  >
                    <Ionicons name="calendar-outline" size={14} color={colors.surface} />
                    <Text style={styles.mapCardBtnPrimaryText}>Book Now</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );

  const listViewHeader = (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={Platform.OS === "web"}
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

        {locationState === "ready" ? (
          nearestCourses.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={Platform.OS === "web"}
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
              <Text style={styles.emptyNearbyText}>Adjust the filters to see more courses across Sri Lanka.</Text>
            </View>
          )
        ) : (
          <View style={styles.locationFallbackCard}>
            <Ionicons name="location-outline" size={24} color={colors.textSoft} style={styles.locationFallbackIcon} />
            <Text style={styles.locationFallbackText}>
              Enable location to see golf courses nearest to you.
            </Text>
            <Pressable
              style={styles.locationFallbackBtn}
              onPress={requestUserLocation}
              variant="cta"
            >
              <Text style={styles.locationFallbackBtnText}>Show Nearby</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.sectionSeparator} />
    </>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      {/* Sticky Header with Search and Toggle */}
      <View style={[styles.topStickyHeader, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses, location, or style"
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search golf courses"
            accessibilityHint="Type to search by course name, location, or style"
          />
          {searchQuery.length > 0 ? (
            <Pressable
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery("")}
              variant="icon"
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </Pressable>
          ) : null}
          <View style={styles.searchDivider} />
          <Pressable
            style={styles.tuneButton}
            onPress={showFilterDropdown ? closeFilterModal : openFilterModal}
            variant="icon"
            accessibilityRole="button"
            accessibilityLabel="Open filters"
            accessibilityHint="Opens rating and price filters modal"
          >
            <Ionicons name="options" size={18} color={colors.primary} />
          </Pressable>
        </View>

        {showFilterDropdown && (
          <>
            <TouchableWithoutFeedback onPress={closeFilterModal}>
              <Animated.View style={[styles.backdrop, { opacity: fadeAnim, left: -horizontalPadding, right: -horizontalPadding }]} />
            </TouchableWithoutFeedback>

            <Animated.View
              style={[
                styles.filterOverlayCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                  left: horizontalPadding,
                  right: horizontalPadding,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filters</Text>
                <View style={styles.modalHeaderActions}>
                  <Pressable style={styles.resetButton} onPress={handleResetFilters}>
                    <Text style={styles.resetButtonText}>Reset All</Text>
                  </Pressable>
                  <Pressable style={styles.modalCloseButton} onPress={closeFilterModal} variant="icon">
                    <Ionicons name="close" size={20} color={colors.primary} />
                  </Pressable>
                </View>
              </View>

              <View>
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownTitle}>Price Range</Text>
                </View>
                <View style={styles.filterChipsContainer}>
                  {PRICE_RANGES.map((range, idx) => (
                    <Pressable
                      key={`price-${idx}`}
                      style={[
                        styles.filterChipOption,
                        selectedPriceRange === idx && styles.filterChipOptionActive,
                      ]}
                      onPress={() => handlePriceRangeChange(idx)}
                      variant="chip"
                    >
                      <Text
                        style={[
                          styles.filterChipOptionText,
                          selectedPriceRange === idx && styles.filterChipOptionTextActive,
                        ]}
                      >
                        {range.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.dropdownDivider} />

              <View>
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownTitle}>Rating</Text>
                </View>
                <View style={styles.filterChipsContainer}>
                  {RATING_FILTERS.map((rating) => (
                    <Pressable
                      key={`rating-${rating.value}`}
                      style={[
                        styles.filterChipOption,
                        selectedRating === rating.value && styles.filterChipOptionActive,
                      ]}
                      onPress={() => handleRatingChange(rating.value)}
                      variant="chip"
                    >
                      <Text
                        style={[
                          styles.filterChipOptionText,
                          selectedRating === rating.value && styles.filterChipOptionTextActive,
                        ]}
                      >
                        {rating.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </Animated.View>
          </>
        )}

        {/* View Mode Toggle Switch */}
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
            onPress={() => setViewMode("list")}
            variant="chip"
            accessibilityRole="tab"
            accessibilityState={{ selected: viewMode === "list" }}
            accessibilityLabel="List View"
          >
            <Ionicons name="list" size={16} color={viewMode === "list" ? colors.surface : colors.primary} />
            <Text style={[styles.toggleBtnText, viewMode === "list" && styles.toggleBtnTextActive]}>List View</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, viewMode === "map" && styles.toggleBtnActive]}
            onPress={() => setViewMode("map")}
            variant="chip"
            accessibilityRole="tab"
            accessibilityState={{ selected: viewMode === "map" }}
            accessibilityLabel="Map View"
          >
            <Ionicons name="map" size={16} color={viewMode === "map" ? colors.surface : colors.primary} />
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
          showsVerticalScrollIndicator={Platform.OS === "web"}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
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
        renderMapView()
      )}
    </SafeAreaView>
  );
}

const themedStyles = createThemedStyleSheet((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.page,
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
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: colors.text,
  },
  clearSearchButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  searchDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  tuneButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: colors.page,
  },
  filterChip: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "600",
    color: colors.textSoft,
  },
  filterChipTextActive: {
    color: colors.surface,
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
    color: colors.text,
  },
  trendingSubtitle: {
    marginTop: 3,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
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
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyNearbyTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: colors.primary,
    fontWeight: "700",
  },
  emptyNearbyText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
    textAlign: "center",
    maxWidth: 280,
  },
  trendingCard: {},
  sectionSeparator: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    height: 1,
    backgroundColor: colors.borderStrong,
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
    color: colors.primary,
    fontWeight: "800",
  },
  mapSubtitle: {
    marginTop: 3,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
    maxWidth: 240,
  },
  mapBadge: {
    height: 34,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mapBadgeText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.primary,
    fontWeight: "700",
  },
  mapCard: {
    height: 300,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  useLocationButton: {
    marginTop: 12,
    minHeight: 40,
    alignSelf: "center",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    backgroundColor: colors.primary,
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
    color: colors.surface,
    fontWeight: "700",
  },
  locationNoticeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  locationNoticeCopy: {
    flex: 1,
  },
  locationNoticeTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: colors.primary,
    fontWeight: "700",
    marginBottom: 2,
  },
  locationNoticeBody: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
  },
  locationNoticeAction: {
    alignSelf: "flex-start",
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  locationNoticeActionText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.primary,
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
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 24,
    gap: 8,
  },
  mapPlaceholderTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: colors.primary,
    fontWeight: "700",
  },
  mapPlaceholderText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
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
    color: colors.primary,
    marginBottom: 2,
  },
  calloutText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: colors.textSoft,
  },
  selectedCourseCard: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
    color: colors.accentWarm,
    letterSpacing: 1.1,
    fontWeight: "700",
    marginBottom: 4,
  },
  selectedCourseTitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: colors.primary,
    fontWeight: "800",
    marginBottom: 3,
  },
  selectedCourseMeta: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
  },
  openMapButton: {
    marginTop: 10,
    height: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  openMapButtonText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: colors.surface,
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
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyCoursesTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: colors.primary,
    fontWeight: "700",
  },
  emptyCoursesText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
    textAlign: "center",
    maxWidth: 280,
  },
  listFooterSpacer: {
    height: 24,
  },
  
  // Modal & Dropdown Styles
  backdrop: {
    position: "absolute",
    top: 80,
    left: -16,
    right: -16,
    height: 1200,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  filterOverlayCard: {
    position: "absolute",
    top: 62,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    zIndex: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  modalHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resetButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  resetButtonText: {
    fontSize: theme.typography.bodySm.fontSize,
    fontWeight: "600",
    color: colors.primary,
  },
  modalTitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "800",
    color: colors.primary,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownHeader: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  dropdownTitle: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.5,
  },
  filterChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  filterChipOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.page,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  filterChipOptionText: {
    fontSize: theme.typography.bodySm.fontSize,
    color: colors.textSoft,
    fontWeight: "500",
  },
  filterChipOptionTextActive: {
    color: colors.primary,
    fontWeight: "700",
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
    borderColor: colors.border,
  },
  dropdownItemText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: colors.textSoft,
    fontWeight: "500",
  },
  dropdownItemTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  dropdownCloseButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  dropdownCloseButtonText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "600",
    color: colors.surface,
  },
  topStickyHeader: {
    backgroundColor: colors.page,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    zIndex: 10,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: colors.primarySoft,
    borderRadius: theme.radius.pill,
    padding: 4,
    marginTop: 10,
    gap: 4,
    alignSelf: "center",
    width: "100%",
    maxWidth: 380,
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
    backgroundColor: colors.primary,
  },
  toggleBtnText: {
    fontSize: theme.typography.bodySm.fontSize,
    fontWeight: "700",
    color: colors.primary,
  },
  toggleBtnTextActive: {
    color: colors.surface,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: colors.page,
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
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 10,
  },
  mapViewTitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: colors.primary,
    fontWeight: "800",
  },
  mapViewSubtitle: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: colors.textSoft,
    marginTop: 2,
  },
  mapViewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.primarySoft,
  },
  mapViewBadgeText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: colors.primary,
    fontWeight: "700",
  },
  mapViewWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceSoft,
  },
  useLocationButtonFloating: {
    position: "absolute",
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
    zIndex: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  floatingBottomContainer: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 84, // Kept above bottom navigation bar
    gap: 8,
    zIndex: 10,
  },
  floatingCourseCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    shadowColor: colors.shadow,
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
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  openMapButtonTextFloating: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.surface,
    fontWeight: "700",
  },
  mapCardInner: {
    gap: 12,
  },
  mapCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  mapCardInfo: {
    flex: 1,
    paddingRight: 24,
    gap: 2,
  },
  mapCardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  mapCardMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mapCardMetaText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: colors.textSoft,
  },
  mapCardMetaDivider: {
    width: 1,
    height: 10,
    backgroundColor: colors.border,
  },
  mapCardCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  mapCardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 12,
    marginTop: 4,
  },
  mapCardPriceBlock: {
    justifyContent: "center",
  },
  mapCardPriceLabel: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.muted,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  mapCardPriceVal: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.accentWarm,
    fontWeight: "800",
  },
  mapCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapCardBtn: {
    height: 36,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  mapCardBtnPrimary: {
    backgroundColor: colors.primary,
  },
  mapCardBtnPrimaryText: {
    fontSize: 11,
    color: colors.surface,
    fontWeight: "700",
  },
  mapCardBtnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  mapCardBtnSecondaryText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "700",
  },
  locationFallbackCard: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: theme.radius.lg,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
    width: "100%",
  },
  locationFallbackIcon: {
    marginBottom: 2,
  },
  locationFallbackText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
    textAlign: "center",
    maxWidth: 280,
    marginBottom: 6,
  },
  locationFallbackBtn: {
    paddingHorizontal: 20,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  locationFallbackBtnText: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: theme.typography.body.fontSize,
  },
  desktopSplitLayout: {
    flex: 1,
    flexDirection: "row",
  },
  desktopListColumn: {
    width: 440,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  desktopMapColumn: {
    flex: 1,
    height: "100%",
  },
}));
