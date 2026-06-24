import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform,  ScrollView, StyleSheet, Text, useWindowDimensions, View, Linking, RefreshControl, Pressable as RNPressable  } from "react-native";
import * as Location from "expo-location";
import Animated, {
    interpolate,
    interpolateColor,
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    useAnimatedScrollHandler,
    runOnJS,
} from "react-native-reanimated";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { CourseCard } from "../components/course-card";
import {
    calculateDistanceKm,
    getCachedUserLocation,
    setCachedUserLocation,
    shouldRefreshLocation,
} from "../services/course-data";
import { useCourseCatalog, getManagedCourseById, refreshCourseCatalog } from "../services/course-management";
import { FavoriteCoursesSection } from "../components/favorite-courses-section";
import { useFavoriteCourseIds, refreshFavoriteCourseIds } from "../services/favorites";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "../components/theme";
import { getCourseImage } from "../lib/image-mapping";
import { useAuthSession, refreshProfile, trackSession } from "../services/auth";
import {
  useBookingState,
  isUpcomingBooking,
  formatBookingDateTime,
  refreshBookings,
} from "../services/bookings";

const HERO_NEWS_IMAGE = require("../assets/images/home-hero-news.webp");
const HERO_OFFER_IMAGE = require("../assets/images/home-hero-offer.webp");
const HERO_MEMBER_IMAGE = require("../assets/images/home-hero-member.webp");

const HERO_SLIDES = [
  {
    id: "news",
    eyebrow: "LATEST UPDATE",
    title: "Club News, Weather Alerts and Fresh Updates",
    description:
      "Catch tournament notes, course maintenance updates, and booking changes before planning your next round.",
    cta: "See Updates",
    route: { pathname: "/notifications", params: { filter: "promotion" } } as any,
    image: HERO_NEWS_IMAGE,
  },
  {
    id: "offer",
    eyebrow: "LIMITED OFFER",
    title: "Golden Hour Rates on Signature Fairways",
    description: "Enjoy special late-day pricing this week on select premium courses across the island.",
    cta: "View Offer",
    route: { pathname: "/notifications", params: { filter: "promotion" } } as any,
    image: HERO_OFFER_IMAGE,
  },
  {
    id: "current",
    eyebrow: "MEMBER EXCLUSIVE",
    title: "Master Your Drive on the World's Finest Greens",
    description:
      "Discover premier access to private courses and world-class tournaments tailored for your handicap.",
    cta: "Book Tee Time",
    route: "/explore" as any,
    image: HERO_MEMBER_IMAGE,
  },
] as const;
const HERO_LOOP_SLIDES = [HERO_SLIDES[HERO_SLIDES.length - 1], ...HERO_SLIDES, HERO_SLIDES[0]] as const;

const EXPLORE_SCROLL_OFFSET = 20;
const HERO_AUTOPLAY_MS = 4500;
const HERO_USER_PAUSE_MS = 8000;
const HERO_INDICATOR_SIZE = 8;
const HERO_INDICATOR_ACTIVE_WIDTH = 30;
const HERO_INDICATOR_GAP = 10;

function HeroIndicatorDot({
  index,
  activeIndex,
}: {
  index: number;
  activeIndex: SharedValue<number>;
}) {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);

  const activeColor = resolvedTheme === "dark" ? "#FFFFFF" : colors.primary;
  const inactiveColor = resolvedTheme === "dark" ? "rgba(255, 255, 255, 0.28)" : colors.borderStrong;

  const dotAnimatedStyle = useAnimatedStyle(() => {
    const N = 3; // HERO_SLIDES.length
    const progressMod = ((activeIndex.value % N) + N) % N;
    let distance = Math.abs(progressMod - index);
    distance = Math.min(distance, N - distance);

    return {
      width: interpolate(
        distance,
        [0, 1],
        [HERO_INDICATOR_ACTIVE_WIDTH, HERO_INDICATOR_SIZE],
        "clamp"
      ),
      opacity: interpolate(
        distance,
        [0, 1],
        [1, 0.45],
        "clamp"
      ),
      backgroundColor: interpolateColor(
        distance,
        [0, 1],
        [activeColor, inactiveColor]
      ),
      transform: [
        {
          scale: interpolate(
            distance,
            [0, 1],
            [1, 0.88],
            "clamp"
          ),
        },
      ],
    };
  });

  return <Animated.View style={[styles.heroDot, dotAnimatedStyle]} />;
}

export default function HomeScreen() {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const router = useRouter();
  const auth = useAuthSession();
  const bookingState = useBookingState();
  const courseCatalog = useCourseCatalog();
  const { width } = useWindowDimensions();
  const { horizontalPadding, screenBottomPadding, scaleFont, scaleLineHeight } = useResponsiveLayout();
  const [refreshing, setRefreshing] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(getCachedUserLocation());

  const checkAndRequestLocation = useCallback(async (forcePrompt = false) => {
    // Skip location request if we already have fresh cached coordinates (less than 5 minutes old)
    // unless the call is explicitly forced (like a pull-to-refresh or fallback button press)
    if (!forcePrompt && !shouldRefreshLocation()) {
      return;
    }

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setUserCoords(null);
        setCachedUserLocation(null);
        return;
      }

      let { status } = await Location.getForegroundPermissionsAsync();
      
      // Request permission only if it's undetermined, OR if the user explicitly clicked the button (forcePrompt = true)
      if (status === "undetermined" || (forcePrompt && status !== "granted")) {
        const response = await Location.requestForegroundPermissionsAsync();
        status = response.status;
      }

      if (status === "granted") {
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown) {
          const coords = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          };
          setUserCoords(coords);
          setCachedUserLocation(coords);
          if (auth.session) {
            void trackSession(auth.session);
          }
        }
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (current) {
          const coords = {
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          };
          setUserCoords(coords);
          setCachedUserLocation(coords);
          if (auth.session) {
            void trackSession(auth.session);
          }
        }
      } else {
        setUserCoords(null);
        setCachedUserLocation(null);
      }
    } catch (err) {
      console.warn("Error getting location:", err);
      setUserCoords(null);
      setCachedUserLocation(null);
    }
  }, [auth.session]);

  useEffect(() => {
    void checkAndRequestLocation();
  }, [checkAndRequestLocation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshProfile(),
        refreshBookings(),
        refreshCourseCatalog(),
        refreshFavoriteCourseIds(),
        checkAndRequestLocation(),
      ]);
    } catch (err) {
      console.warn("Failed to refresh home screen data", err);
    } finally {
      setRefreshing(false);
    }
  }, [checkAndRequestLocation]);
  const heroScrollRef = useRef<Animated.ScrollView>(null);
  const autoplayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoplayResumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeHeroIndexRef = useRef(0);
  const activeHeroLoopIndexRef = useRef(1);
  const heroIndicatorIndex = useSharedValue(0);
  const isProgrammaticScrollRef = useRef(false);
  const allCourses = courseCatalog.courses;
  const favoriteCourseIds = useFavoriteCourseIds();
  const favoriteCourseIdSet = useMemo(() => new Set(favoriteCourseIds), [favoriteCourseIds]);

  const upcomingBookings = useMemo(() => {
    return bookingState.bookings.filter(isUpcomingBooking);
  }, [bookingState.bookings]);



  const nextBooking = useMemo(() => {
    return upcomingBookings[0] || null;
  }, [upcomingBookings]);

  const nextBookingCourse = useMemo(() => {
    if (!nextBooking) return null;
    return getManagedCourseById(nextBooking.course_id);
  }, [nextBooking]);
  const featuredHomeCourses = useMemo(() => allCourses.slice(0, 3), [allCourses]);
  const getawayHomeCourses = useMemo(() => {
    const getaways = allCourses.filter((course) => course.isGetaway);
    const sourceList = getaways.length > 0 ? getaways : allCourses.slice(4, 8);
    return sourceList.map((course) => ({
      id: course.id,
      title: course.title,
      place: course.location,
      image: course.image,
    }));
  }, [allCourses]);
  const homeNearestCourses = useMemo(
    () => {
      if (!userCoords) return [];
      return allCourses
        .map((course) => ({
          ...course,
          distanceKm: calculateDistanceKm(userCoords, course.coordinates),
        }))
        .filter((course) => course.distanceKm <= 100)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 5);
    },
    [allCourses, userCoords]
  );
  const favoriteCourses = useMemo(
    () => allCourses.filter((course) => favoriteCourseIdSet.has(course.id)).slice(0, 3),
    [allCourses, favoriteCourseIdSet]
  );
  const isTabletLike = width >= 768;
  const isCompactScreen = width < 390;
  const heroCardWidth = Math.round(width - horizontalPadding * 2);
  const heroCardHeight = isTabletLike ? 380 : (width < 360 ? 290 : 312);
  const openCourseDetails = useCallback(
    (courseId: string) => {
      router.navigate({ pathname: "/course-details", params: { id: courseId } });
    },
    [router]
  );

  const stopHeroAutoplay = useCallback(() => {
    if (autoplayIntervalRef.current) {
      clearInterval(autoplayIntervalRef.current);
      autoplayIntervalRef.current = null;
    }
  }, []);

  const clearHeroResumeTimeout = useCallback(() => {
    if (autoplayResumeTimeoutRef.current) {
      clearTimeout(autoplayResumeTimeoutRef.current);
      autoplayResumeTimeoutRef.current = null;
    }
  }, []);

  const jumpToHeroLoopIndex = useCallback(
    (loopIndex: number) => {
      activeHeroLoopIndexRef.current = loopIndex;
      heroScrollRef.current?.scrollTo({ x: loopIndex * heroCardWidth, animated: false });
    },
    [heroCardWidth]
  );

  const startHeroAutoplay = useCallback(() => {
    stopHeroAutoplay();
    autoplayIntervalRef.current = setInterval(() => {
      isProgrammaticScrollRef.current = true;
      if (Platform.OS === 'web') {
        const nextIndex = (activeHeroIndexRef.current + 1) % HERO_SLIDES.length;
        activeHeroIndexRef.current = nextIndex;
        heroScrollRef.current?.scrollTo({ x: nextIndex * heroCardWidth, animated: true });
      } else {
        const nextLoopIndex = activeHeroLoopIndexRef.current + 1;
        heroScrollRef.current?.scrollTo({ x: nextLoopIndex * heroCardWidth, animated: true });
      }
    }, HERO_AUTOPLAY_MS);
  }, [heroCardWidth, stopHeroAutoplay]);

  const pauseHeroAutoplay = useCallback(() => {
    stopHeroAutoplay();
    clearHeroResumeTimeout();
    autoplayResumeTimeoutRef.current = setTimeout(() => {
      startHeroAutoplay();
    }, HERO_USER_PAUSE_MS);
  }, [clearHeroResumeTimeout, startHeroAutoplay, stopHeroAutoplay]);

  const updateActiveIndexJS = useCallback((index: number) => {
    if (Platform.OS === 'web') {
      activeHeroIndexRef.current = Math.max(0, Math.min(index, HERO_SLIDES.length - 1));
    } else {
      const roundedActiveIdx = index - 1;
      if (index > 0 && index < HERO_LOOP_SLIDES.length - 1) {
        activeHeroIndexRef.current = roundedActiveIdx;
        activeHeroLoopIndexRef.current = index;
      }
    }

    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false;
      return;
    }
    pauseHeroAutoplay();
  }, [pauseHeroAutoplay]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const scrollX = event.contentOffset.x;
      const progress = scrollX / heroCardWidth;

      if (Platform.OS === 'web') {
        heroIndicatorIndex.value = Math.max(0, Math.min(progress, HERO_SLIDES.length - 1));
      } else {
        heroIndicatorIndex.value = progress - 1;
      }

      const index = Math.round(progress);
      runOnJS(updateActiveIndexJS)(index);
    },
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      heroIndicatorIndex.value = 0;
    } else {
      jumpToHeroLoopIndex(1);
      heroIndicatorIndex.value = 0;
    }
    startHeroAutoplay();

    return () => {
      stopHeroAutoplay();
      clearHeroResumeTimeout();
    };
  }, [clearHeroResumeTimeout, heroIndicatorIndex, jumpToHeroLoopIndex, startHeroAutoplay, stopHeroAutoplay]);



  const nextBookingWidget = nextBooking && nextBookingCourse ? (
    <View style={styles.nextRoundSection}>
      {isTabletLike ? null : (
        <View style={styles.nextRoundHeader}>
          <Text style={styles.kicker}>UP NEXT</Text>
          <Text style={styles.nextRoundTitle}>Your Upcoming Tee Time</Text>
        </View>
      )}
      <View style={styles.nextRoundCard}>
        <View style={styles.nextRoundCardBody}>
          <View style={styles.nextRoundCourseRow}>
            <Ionicons name="golf" size={16} color={colors.primary} style={styles.nextRoundIcon} />
            <Text style={styles.nextRoundCourseName} numberOfLines={1}>
              {nextBookingCourse.title}
            </Text>
          </View>
          
          <View style={styles.nextRoundTimeRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSoft} style={styles.nextRoundIcon} />
            <Text style={styles.nextRoundTimeText}>
              {formatBookingDateTime(nextBooking)}
            </Text>
          </View>

          <View style={styles.nextRoundPlayersRow}>
            <Ionicons name="people-outline" size={14} color={colors.textSoft} style={styles.nextRoundIcon} />
            <Text style={styles.nextRoundTimeText}>
              {nextBooking.players} {nextBooking.players === 1 ? "Player" : "Players"}
            </Text>
          </View>

          <View style={styles.nextRoundActions}>
            <Pressable
              style={[styles.nextRoundBtn, styles.nextRoundBtnSecondary]}
              onPress={() => {
                const lat = nextBookingCourse.coordinates?.latitude ?? 6.9271;
                const lon = nextBookingCourse.coordinates?.longitude ?? 79.8612;
                const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
                Linking.openURL(url);
              }}
              variant="chip"
            >
              <Ionicons name="map-outline" size={14} color={colors.primary} />
              <Text style={styles.nextRoundBtnTextSecondary}>Directions</Text>
            </Pressable>
            
            <Pressable
              style={[styles.nextRoundBtn, styles.nextRoundBtnPrimary]}
              onPress={() => router.navigate({
                pathname: "/manage-booking",
                params: { bookingId: nextBooking.id }
              })}
              variant="cta"
            >
              <Text style={styles.nextRoundBtnTextPrimary}>Manage</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  ) : (
    <View style={styles.nextRoundSection}>
      {isTabletLike ? null : (
        <View style={styles.nextRoundHeader}>
          <Text style={styles.kicker}>UP NEXT</Text>
          <Text style={styles.nextRoundTitle}>Your Upcoming Tee Time</Text>
        </View>
      )}
      <View style={styles.nextRoundCardEmpty}>
        <View style={styles.nextRoundEmptyContent}>
          <Ionicons name="golf-outline" size={28} color={colors.muted} />
          <View style={styles.nextRoundEmptyTextCol}>
            <Text style={styles.nextRoundEmptyTitle}>No Upcoming Tee Times</Text>
            <Text style={styles.nextRoundEmptyDesc}>Ready for a round? Book a signature green nearby.</Text>
          </View>
        </View>
        <Pressable
          style={styles.nextRoundEmptyBookBtn}
          onPress={() => router.navigate("/explore")}
          variant="cta"
        >
          <Text style={styles.nextRoundEmptyBookBtnText}>Book Now</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={Platform.OS === "web"}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: isTabletLike ? 14 : 10,
            paddingBottom: Math.max(screenBottomPadding - 20, 140),
          },
        ]}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
      >
        {/* Welcome Header */}
        <View style={styles.dashboardHeader}>
          <Text style={styles.welcomeSubtitle}>
            {(() => {
              const hour = new Date().getHours();
              if (hour < 12) return "GOOD MORNING";
              if (hour < 17) return "GOOD AFTERNOON";
              return "GOOD EVENING";
            })()}
          </Text>
          <Text style={styles.welcomeTitle}>
            Hello, {auth.profile?.full_name || auth.profile?.username || "Golfer"}!
          </Text>
        </View>

        <View style={styles.heroShell}>
          <Animated.ScrollView
            ref={heroScrollRef}
            style={styles.heroCarousel}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            decelerationRate="fast"
            snapToInterval={heroCardWidth}
            snapToAlignment="start"
            disableIntervalMomentum
            onScroll={scrollHandler}
            onScrollBeginDrag={pauseHeroAutoplay}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(event) => {
              if (Platform.OS === 'web') {
                return;
              }
              const scrollX = event.nativeEvent.contentOffset.x;
              const index = Math.round(scrollX / heroCardWidth);

              if (index <= 0) {
                activeHeroIndexRef.current = HERO_SLIDES.length - 1;
                heroIndicatorIndex.value = HERO_SLIDES.length - 1;
                jumpToHeroLoopIndex(HERO_SLIDES.length);
                return;
              }

              if (index >= HERO_LOOP_SLIDES.length - 1) {
                activeHeroIndexRef.current = 0;
                heroIndicatorIndex.value = 0;
                jumpToHeroLoopIndex(1);
                return;
              }
            }}
          >
            {(Platform.OS === 'web' ? HERO_SLIDES : HERO_LOOP_SLIDES).map((slide, index) => (
              <View key={`${slide.id}-${index}`} style={[styles.heroCard, { width: heroCardWidth, height: heroCardHeight }]}>
                <AppImage
                  source={slide.image}
                  style={styles.heroImage}
                  contentPosition="center"
                />
                <View style={styles.heroOverlay} />
                <View style={styles.heroContent}>
                  <Text style={styles.memberTag}>{slide.eyebrow}</Text>
                  <Text
                    style={[
                      styles.heroTitle,
                      isCompactScreen && styles.heroTitleCompact,
                      {
                        fontSize: scaleFont(styles.heroTitle.fontSize),
                        lineHeight: scaleLineHeight(styles.heroTitle.lineHeight),
                      },
                    ]}
                  >
                    {slide.title}
                  </Text>
                  <Text style={[styles.heroSubtitle, isCompactScreen && styles.heroSubtitleCompact]}>
                    {slide.description}
                  </Text>
                  <Pressable style={styles.bookButton} onPress={() => router.navigate(slide.route)} variant="cta">
                    <Text style={styles.bookButtonText}>{slide.cta}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Animated.ScrollView>

          <View style={styles.heroDots}>
            {HERO_SLIDES.map((slide, index) => (
              <RNPressable
                key={slide.id}
                onPress={() => {
                  pauseHeroAutoplay();
                  isProgrammaticScrollRef.current = true;
                  activeHeroIndexRef.current = index;
                  activeHeroLoopIndexRef.current = index + 1;
                  const scrollX = (Platform.OS === 'web' ? index : index + 1) * heroCardWidth;
                  heroScrollRef.current?.scrollTo({ x: scrollX, animated: true });
                }}
                style={{ padding: 4 }}
              >
                <HeroIndicatorDot index={index} activeIndex={heroIndicatorIndex} />
              </RNPressable>
            ))}
          </View>
        </View>

        {/* Upcoming Round Card */}
        {nextBookingWidget}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.kicker}>HANDPICKED</Text>
            <Text
              style={[
                styles.sectionTitle,
                {
                  fontSize: scaleFont(styles.sectionTitle.fontSize),
                  lineHeight: scaleLineHeight(styles.sectionTitle.lineHeight),
                },
              ]}
            >
              Featured Courses
            </Text>
          </View>
          <Pressable
            style={styles.viewAllButton}
            onPress={() =>
              router.navigate({
                pathname: "/explore",
                params: { section: "all-courses", scrollOffset: String(EXPLORE_SCROLL_OFFSET) },
              })
            }
            variant="chip"
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>

        {isTabletLike ? (
          <View style={styles.desktopGrid}>
            {featuredHomeCourses.map((course) => (
              <CourseCard
                key={course.id}
                variant="featured"
                title={course.title}
                location={course.location}
                image={course.image}
                price={course.price}
                rating={course.rating}
                styleLabel={course.style}
                cardStyle={styles.desktopFeaturedCard}
                onPress={() => openCourseDetails(course.id)}
              />
            ))}
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={Platform.OS === "web"}
            contentContainerStyle={styles.featuredRow}
            bounces={false}
            overScrollMode="never"
          >
            {featuredHomeCourses.map((course) => (
              <CourseCard
                key={course.id}
                variant="featured"
                title={course.title}
                location={course.location}
                image={course.image}
                price={course.price}
                rating={course.rating}
                styleLabel={course.style}
                onPress={() => openCourseDetails(course.id)}
              />
            ))}
          </ScrollView>
        )}

        <FavoriteCoursesSection
          courses={favoriteCourses}
          onPressCourse={openCourseDetails}
          onPressViewAll={() => router.navigate("/favourites")}
        />

        <View style={styles.trendingSection}>
          <View style={styles.trendingHeader}>
            <View>
              <Text style={styles.kicker}>NEAR YOU</Text>
              <Text
                style={[
                  styles.trendingTitle,
                  {
                    fontSize: scaleFont(styles.trendingTitle.fontSize),
                    lineHeight: scaleLineHeight(styles.trendingTitle.lineHeight),
                  },
                ]}
              >
                Explore Nearby
              </Text>
              <Text style={styles.trendingSubtitle}>Courses within 100 km of your current location.</Text>
            </View>
          </View>

          {userCoords ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={Platform.OS === "web"}
              contentContainerStyle={styles.trendingList}
              bounces={false}
              overScrollMode="never"
            >
              {homeNearestCourses.map((course) => (
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
                  cardStyle={[styles.trendingCard, isTabletLike && styles.trendingCardTablet]}
                  compactActionLabel="View Details"
                  onPressCompactAction={() => openCourseDetails(course.id)}
                  onPress={() =>
                    router.navigate({
                      pathname: "/explore",
                      params: { view: "map", courseId: course.id },
                    })
                  }
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.locationFallbackCard}>
              <Ionicons name="location-outline" size={24} color={colors.textSoft} style={styles.locationFallbackIcon} />
              <Text style={styles.locationFallbackText}>
                Enable location to see golf courses nearest to you.
              </Text>
              <Pressable
                style={styles.locationFallbackBtn}
                onPress={async () => {
                  await checkAndRequestLocation(true);
                  router.navigate("/explore");
                }}
                variant="cta"
              >
                <Text style={styles.locationFallbackBtnText}>Show Nearby</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.getawaysSection}>
          <Text
            style={[
              styles.sectionTitle,
              {
                fontSize: scaleFont(styles.sectionTitle.fontSize),
                lineHeight: scaleLineHeight(styles.sectionTitle.lineHeight),
              },
            ]}
          >
            Weekend Getaways
          </Text>
          <View style={styles.getawayList}>
            {getawayHomeCourses.map((getaway) => (
              <Pressable
                key={getaway.id}
                style={[styles.getawaySquareCard, isTabletLike && styles.getawaySquareCardTablet]}
                onPress={() => openCourseDetails(getaway.id)}
                variant="card"
              >
                <View style={styles.getawaySquareInner}>
                  <AppImage source={getCourseImage(getaway.image)} style={styles.getawaySquareImage} />
                  <View style={styles.getawaySquareOverlay} />
                  <View style={styles.getawaySquareInfo}>
                    <Text style={styles.getawaySquareName} numberOfLines={2}>
                      {getaway.title}
                    </Text>
                    <Text style={styles.getawaySquarePlace} numberOfLines={1}>
                      {getaway.place}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const themedStyles = createThemedStyleSheet((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.page,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 140,
  },
  heroShell: {
    marginBottom: 28,
  },
  heroCarousel: {
    borderRadius: 18,
    overflow: "hidden",
  },
  heroCard: {
    borderRadius: 18,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
    borderRadius: 18,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderRadius: 18,
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  memberTag: {
    alignSelf: "flex-start",
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: theme.typography.label.fontWeight,
    color: "#FFF3C7",
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 10,
    letterSpacing: theme.typography.label.letterSpacing,
  },
  heroTitle: {
    fontSize: theme.typography.h4.fontSize,
    lineHeight: theme.typography.h4.lineHeight,
    fontWeight: theme.typography.h4.fontWeight,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  heroTitleCompact: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
  },
  heroSubtitle: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: 12,
    maxWidth: 340,
  },
  heroSubtitleCompact: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    marginBottom: 10,
  },
  bookButton: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  bookButtonText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    fontWeight: "700",
    color: "#111827",
  },
  heroDots: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: HERO_INDICATOR_GAP,
    marginTop: 12,
  },
  heroDot: {
    width: HERO_INDICATOR_SIZE,
    height: HERO_INDICATOR_SIZE,
    borderRadius: 999,
    backgroundColor: colors.borderStrong,
    shadowColor: colors.primary,
    shadowOpacity: 0.14,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    alignSelf: "flex-end",
    paddingHorizontal: 11,
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  viewAllText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
    color: colors.primary,
  },
  kicker: {
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: theme.typography.label.fontWeight,
    color: colors.accentWarm,
    letterSpacing: theme.typography.label.letterSpacing,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: theme.typography.h4.fontSize,
    lineHeight: theme.typography.h4.lineHeight,
    fontWeight: theme.typography.h4.fontWeight,
    color: colors.text,
  },
  featuredRow: {
    gap: 14,
    paddingBottom: 22,
    paddingRight: 8,
  },
  trendingSection: {
    marginTop: 22,
    marginBottom: 26,
  },
  trendingHeader: {
    marginBottom: 14,
  },
  trendingTitle: {
    fontSize: theme.typography.h4.fontSize,
    lineHeight: theme.typography.h4.lineHeight,
    fontWeight: theme.typography.h4.fontWeight,
    color: colors.text,
  },
  trendingSubtitle: {
    marginTop: 4,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
    maxWidth: 280,
  },
  trendingList: {
    gap: 12,
    paddingLeft: 2,
    paddingVertical: 4,
    paddingRight: 10,
  },
  trendingCard: {},
  trendingCardTablet: {},
  getawaysSection: {
    marginBottom: 12,
  },
  getawayList: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingVertical: 4,
    gap: 12,
  },
  getawaySquareCard: {
    width: "48.4%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  getawaySquareInner: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  getawaySquareImage: {
    width: "100%",
    height: "100%",
  },
  getawaySquareOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  getawaySquareInfo: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
  },
  getawaySquareName: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: "#FFFFFF",
    fontWeight: theme.typography.title.fontWeight,
  },
  getawaySquarePlace: {
    marginTop: 2,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: theme.typography.caption.fontWeight,
    letterSpacing: theme.typography.caption.letterSpacing,
  },
  dashboardHeader: {
    marginTop: 6,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: theme.typography.overline.fontSize,
    lineHeight: theme.typography.overline.lineHeight,
    fontWeight: theme.typography.overline.fontWeight,
    color: colors.accentWarm,
    letterSpacing: theme.typography.overline.letterSpacing,
    marginBottom: 2,
  },
  welcomeTitle: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: theme.typography.h3.fontWeight,
    color: colors.text,
  },
  playerCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 16,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  playerCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    paddingBottom: 12,
    marginBottom: 12,
  },
  playerCardLabel: {
    fontSize: theme.typography.overline.fontSize,
    lineHeight: theme.typography.overline.lineHeight,
    fontWeight: theme.typography.overline.fontWeight,
    color: colors.textSoft,
    letterSpacing: theme.typography.overline.letterSpacing,
    marginBottom: 2,
  },
  playerCardTier: {
    fontSize: theme.typography.title.fontSize,
    fontWeight: "800",
    color: colors.primary,
  },
  tierIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  playerCardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playerStatBox: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  playerStatVal: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.h4.fontWeight,
    color: colors.primary,
  },
  playerStatStatus: {
    color: colors.accentWarm,
  },
  playerStatLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: theme.typography.caption.fontWeight,
    color: colors.textSoft,
  },
  playerStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderSoft,
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    shadowColor: colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  quickActionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: theme.typography.bodySm.fontSize,
    fontWeight: "700",
    color: colors.text,
  },
  nextRoundSection: {
    marginBottom: 26,
  },
  nextRoundHeader: {
    marginBottom: 10,
  },
  nextRoundTitle: {
    fontSize: theme.typography.h4.fontSize,
    lineHeight: theme.typography.h4.lineHeight,
    fontWeight: theme.typography.h4.fontWeight,
    color: colors.text,
  },
  nextRoundCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  nextRoundCardBody: {
    padding: 16,
  },
  nextRoundCourseRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  nextRoundCourseName: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.title.fontWeight,
    color: colors.primary,
    flex: 1,
  },
  nextRoundTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  nextRoundPlayersRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  nextRoundIcon: {
    marginRight: 8,
  },
  nextRoundTimeText: {
    fontSize: theme.typography.body.fontSize,
    color: colors.textSoft,
    fontWeight: "500",
  },
  nextRoundActions: {
    flexDirection: "row",
    gap: 10,
  },
  nextRoundBtn: {
    flex: 1,
    height: 38,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  nextRoundBtnPrimary: {
    backgroundColor: colors.primary,
  },
  nextRoundBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  nextRoundBtnTextPrimary: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: theme.typography.bodySm.fontSize,
  },
  nextRoundBtnTextSecondary: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: theme.typography.bodySm.fontSize,
  },
  nextRoundCardEmpty: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: theme.radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  nextRoundEmptyContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nextRoundEmptyTextCol: {
    flex: 1,
    gap: 2,
  },
  nextRoundEmptyTitle: {
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.title.fontWeight,
    color: colors.text,
  },
  nextRoundEmptyDesc: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
  },
  nextRoundEmptyBookBtn: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  nextRoundEmptyBookBtnText: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: theme.typography.bodySm.fontSize,
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
  desktopRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 26,
  },
  desktopGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 22,
  },
  desktopFeaturedCard: {
    width: "31.5%",
    minWidth: 280,
  },
  getawaySquareCardTablet: {
    width: "23.5%",
  },
}));
