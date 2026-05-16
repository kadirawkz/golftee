import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, InteractionManager, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { CourseCard } from "../components/course-card";
import {
    calculateDistanceKm,
    CourseStyle,
    DEFAULT_USER_LOCATION,
    SRI_LANKA_MAP_REGION,
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
const USER_FOCUS_REGION_DELTA = {
  latitudeDelta: 0.75,
  longitudeDelta: 0.75,
} as const;

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
  const mapRef = useRef<MapView>(null);
  const hasAutoScrolled = useRef(false);
  const locationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [horizontalScrollStartY, setHorizontalScrollStartY] = useState<number | null>(null);
  const [mapSectionY, setMapSectionY] = useState<number | null>(null);
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

    if (showInteractiveMapRef.current) {
      mapRef.current?.animateToRegion(
        {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          ...USER_FOCUS_REGION_DELTA,
        },
        320
      );
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

    mapRef.current?.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        ...USER_FOCUS_REGION_DELTA,
      },
      320
    );
    hasCenteredOnUser.current = true;
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

    setSelectedCourseId(course.id);
    if (mapSectionY !== null) {
      scrollRef.current?.scrollToOffset({
        offset: Math.max(mapSectionY - 12, 0),
        animated: true,
      });
    }
    mapRef.current?.animateToRegion(
      {
        latitude: course.coordinates.latitude,
        longitude: course.coordinates.longitude,
        latitudeDelta: 0.9,
        longitudeDelta: 0.9,
      },
      300
    );
  }, [displayedCoursesById, mapSectionY]);

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

  const headerContent = (
    <>
      <View style={styles.heroSearchWrap}>
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
      </View>

      <View
        style={styles.mapSection}
        onLayout={(event) => {
          setMapSectionY(event.nativeEvent.layout.y);
        }}
      >
        <View style={styles.mapHeader}>
          <View>
            <Text style={styles.mapTitle}>Sri Lanka Course Map</Text>
            <Text style={styles.mapSubtitle}>{locationLabel}</Text>
          </View>
          <View style={styles.mapBadge}>
            <Ionicons name="location" size={14} color={theme.colors.primary} />
            <Text style={styles.mapBadgeText}>{displayedCoursesWithDistance.length} pins</Text>
          </View>
        </View>

        <View style={styles.mapCard}>
          {showInteractiveMap ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={SRI_LANKA_MAP_REGION}
              provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
              showsUserLocation={locationState === "ready"}
              showsMyLocationButton={locationState === "ready"}
              onMapReady={() => {
                if (locationState === "ready" && !hasCenteredOnUser.current) {
                  mapRef.current?.animateToRegion(
                    {
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                      ...USER_FOCUS_REGION_DELTA,
                    },
                    320
                  );
                  hasCenteredOnUser.current = true;
                }
              }}
            >
              {locationState !== "ready" ? (
                <Marker
                  coordinate={userLocation}
                  pinColor="#1D4ED8"
                  title="Colombo reference point"
                  description={locationLabel}
                />
              ) : null}
              {displayedCoursesWithDistance.map((course) => (
                <Marker
                  key={`${course.id}-${course.id === selectedCourseId ? "selected" : "default"}`}
                  coordinate={course.coordinates}
                  pinColor={course.id === selectedCourseId ? "#F4C542" : "#2E8B57"}
                  onPress={() => setSelectedCourseId(course.id)}
                >
                  <Callout onPress={() => openCourseDetails(course.id)}>
                    <View style={styles.callout}>
                      <Text style={styles.calloutTitle}>{course.title}</Text>
                      <Text style={styles.calloutText}>
                        {course.location} - {course.distanceKm.toFixed(0)} km away
                      </Text>
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={24} color={theme.colors.muted} />
              <Text style={styles.mapPlaceholderTitle}>Loading map...</Text>
              <Text style={styles.mapPlaceholderText}>Course results are ready. Interactive map follows right after the screen settles.</Text>
            </View>
          )}
        </View>

        <Pressable
          style={[styles.useLocationButton, locationState === "loading" && styles.useLocationButtonDisabled]}
          onPress={() => void requestUserLocation()}
          disabled={locationState === "loading"}
          variant="button"
        >
          <Ionicons
            name={locationState === "ready" ? "locate" : "locate-outline"}
            size={18}
            color={theme.colors.surface}
          />
          <Text style={styles.useLocationButtonText}>
            {locationState === "loading" ? "Finding Location..." : "Use My Location"}
          </Text>
        </Pressable>

        {locationNotice.kind !== "none" ? (
          <View style={styles.locationNoticeCard}>
            <View style={styles.locationNoticeHeader}>
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
          </View>
        ) : null}

        {selectedCourse ? (
          <Pressable
            style={styles.selectedCourseCard}
            onPress={() => openCourseDetails(selectedCourse.id)}
            variant="card"
          >
            <View style={styles.selectedCourseCopy}>
              <Text style={styles.selectedCourseLabel}>SELECTED COURSE</Text>
              <Text style={styles.selectedCourseTitle}>{selectedCourse.title}</Text>
              <Text style={styles.selectedCourseMeta}>
                {selectedCourse.location} - {selectedCourse.distanceKm.toFixed(0)} km away
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
          </Pressable>
        ) : null}

        {selectedCourse ? (
          <Pressable
            style={styles.openMapButton}
            onPress={() =>
              openInGoogleMaps({
                coordinates: selectedCourse.coordinates,
                placeQuery: selectedCourse.placeQuery,
                placeId: selectedCourse.placeId,
              })
            }
            variant="cta"
          >
            <Ionicons name="navigate-outline" size={18} color={theme.colors.surface} />
            <Text style={styles.openMapButtonText}>Open in Google Maps</Text>
          </Pressable>
        ) : null}
      </View>

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
    </>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

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
        ListHeaderComponent={headerContent}
        ListEmptyComponent={
          <View style={styles.emptyCoursesState}>
            <Text style={styles.emptyCoursesTitle}>No courses match your filters</Text>
            <Text style={styles.emptyCoursesText}>Try widening the price range, lowering the rating filter, or clearing search.</Text>
          </View>
        }
        ListFooterComponent={<View style={styles.listFooterSpacer} />}
      />
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
});
