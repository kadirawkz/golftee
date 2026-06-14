import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View, Linking } from "react-native";
import Animated, {
    interpolate,
    interpolateColor,
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { CourseCard } from "../components/course-card";
import {
    calculateDistanceKm,
    DEFAULT_USER_LOCATION,
} from "../components/course-data";
import { useCourseCatalog, getManagedCourseById } from "../components/course-management";
import { FavoriteCoursesSection } from "../components/favorite-courses-section";
import { useFavoriteCourseIds } from "../components/favorites";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";
import { getCourseImage } from "../lib/image-mapping";
import { useAuthSession } from "../components/auth";
import {
  useBookingState,
  isUpcomingBooking,
  formatBookingDateTime,
  isHistoricalBooking,
} from "../components/bookings";

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
    route: "/notifications" as const,
    image: HERO_NEWS_IMAGE,
  },
  {
    id: "offer",
    eyebrow: "LIMITED OFFER",
    title: "Golden Hour Rates on Signature Fairways",
    description: "Enjoy special late-day pricing this week on select premium courses across the island.",
    cta: "View Offer",
    route: "/explore" as const,
    image: HERO_OFFER_IMAGE,
  },
  {
    id: "current",
    eyebrow: "MEMBER EXCLUSIVE",
    title: "Master Your Drive on the World's Finest Greens",
    description:
      "Discover premier access to private courses and world-class tournaments tailored for your handicap.",
    cta: "Book Tee Time",
    route: "/explore" as const,
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
  const dotAnimatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(activeIndex.value - index);

    return {
      width: interpolate(distance, [0, 1, 2], [HERO_INDICATOR_ACTIVE_WIDTH, 16, HERO_INDICATOR_SIZE]),
      opacity: interpolate(distance, [0, 1, 2], [1, 0.72, 0.38]),
      backgroundColor: interpolateColor(
        distance,
        [0, 1, 2],
        [theme.colors.primary, theme.colors.accentWarm, theme.colors.borderStrong]
      ),
      transform: [{ scale: interpolate(distance, [0, 1, 2], [1, 0.95, 0.88]) }],
    };
  });

  return <Animated.View style={[styles.heroDot, dotAnimatedStyle]} />;
}

export default function HomeScreen() {
  const router = useRouter();
  const auth = useAuthSession();
  const bookingState = useBookingState();
  const courseCatalog = useCourseCatalog();
  const { width } = useWindowDimensions();
  const { horizontalPadding, screenBottomPadding, scaleFont, scaleLineHeight } = useResponsiveLayout();
  const heroScrollRef = useRef<ScrollView>(null);
  const autoplayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoplayResumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeHeroIndexRef = useRef(0);
  const activeHeroLoopIndexRef = useRef(1);
  const heroIndicatorIndex = useSharedValue(0);
  const allCourses = courseCatalog.courses;
  const favoriteCourseIds = useFavoriteCourseIds();
  const favoriteCourseIdSet = useMemo(() => new Set(favoriteCourseIds), [favoriteCourseIds]);

  const upcomingBookings = useMemo(() => {
    return bookingState.bookings.filter(isUpcomingBooking);
  }, [bookingState.bookings]);

  const completedRounds = useMemo(() => {
    return bookingState.bookings.filter((b) => b.status === "completed" || isHistoricalBooking(b)).length;
  }, [bookingState.bookings]);

  const nextBooking = useMemo(() => {
    return upcomingBookings[0] || null;
  }, [upcomingBookings]);

  const nextBookingCourse = useMemo(() => {
    if (!nextBooking) return null;
    return getManagedCourseById(nextBooking.course_id);
  }, [nextBooking]);
  const featuredHomeCourses = useMemo(() => allCourses.slice(0, 3), [allCourses]);
  const getawayHomeCourses = useMemo(
    () => allCourses.slice(4, 8).map((course) => ({ id: course.id, title: course.title, place: course.location, image: course.image })),
    [allCourses]
  );
  const homeNearestCourses = useMemo(
    () =>
      allCourses
        .map((course) => ({
          ...course,
          distanceKm: calculateDistanceKm(DEFAULT_USER_LOCATION, course.coordinates),
        }))
        .filter((course) => course.distanceKm <= 100)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 5),
    [allCourses]
  );
  const favoriteCourses = useMemo(
    () => allCourses.filter((course) => favoriteCourseIdSet.has(course.id)).slice(0, 3),
    [allCourses, favoriteCourseIdSet]
  );
  const isTabletLike = width >= 768;
  const isCompactScreen = width < 390;
  const heroCardWidth = isTabletLike
    ? Math.min(Math.round(width - horizontalPadding * 2), 560)
    : Math.max(Math.round(width - horizontalPadding * 2), 280);
  const heroCardHeight = width < 360 ? 290 : 312;
  const openCourseDetails = useCallback(
    (courseId: string) => {
      router.push({ pathname: "/course-details", params: { id: courseId } });
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

  const animateHeroIndicator = useCallback(
    (index: number, immediate = false) => {
      if (immediate) {
        heroIndicatorIndex.value = index;
        return;
      }

      heroIndicatorIndex.value = withSpring(index, {
        stiffness: 240,
        damping: 24,
        mass: 0.82,
      });
    },
    [heroIndicatorIndex]
  );

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
      const nextLoopIndex = activeHeroLoopIndexRef.current + 1;
      heroScrollRef.current?.scrollTo({ x: nextLoopIndex * heroCardWidth, animated: true });
    }, HERO_AUTOPLAY_MS);
  }, [heroCardWidth, stopHeroAutoplay]);

  const pauseHeroAutoplay = useCallback(() => {
    stopHeroAutoplay();
    clearHeroResumeTimeout();
    autoplayResumeTimeoutRef.current = setTimeout(() => {
      startHeroAutoplay();
    }, HERO_USER_PAUSE_MS);
  }, [clearHeroResumeTimeout, startHeroAutoplay, stopHeroAutoplay]);

  useEffect(() => {
    jumpToHeroLoopIndex(1);
    animateHeroIndicator(0, true);
    startHeroAutoplay();

    return () => {
      stopHeroAutoplay();
      clearHeroResumeTimeout();
    };
  }, [animateHeroIndicator, clearHeroResumeTimeout, jumpToHeroLoopIndex, startHeroAutoplay, stopHeroAutoplay]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: isTabletLike ? 14 : 10,
            paddingBottom: Math.max(screenBottomPadding - 20, 140),
          },
        ]}
        bounces={false}
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

        {/* Player Stats Card */}
        <View style={styles.playerCard}>
          <View style={styles.playerCardHeader}>
            <View>
              <Text style={styles.playerCardLabel}>MEMBERSHIP TIER</Text>
              <Text style={styles.playerCardTier}>
                {((auth.profile as any)?.membership_tiers?.name as string)?.toUpperCase() ?? "STANDARD MEMBER"}
              </Text>
            </View>
            <View style={styles.tierIconWrap}>
              <Ionicons name="ribbon-outline" size={18} color={theme.colors.accentWarm} />
            </View>
          </View>
          
          <View style={styles.playerCardStats}>
            <View style={styles.playerStatBox}>
              <Text style={styles.playerStatVal}>
                {auth.profile?.handicap ? Number(auth.profile.handicap).toFixed(1) : "—"}
              </Text>
              <Text style={styles.playerStatLabel}>Handicap</Text>
            </View>
            
            <View style={styles.playerStatDivider} />
            
            <View style={styles.playerStatBox}>
              <Text style={styles.playerStatVal}>{completedRounds}</Text>
              <Text style={styles.playerStatLabel}>Rounds</Text>
            </View>
            
            <View style={styles.playerStatDivider} />
            
            <View style={styles.playerStatBox}>
              <Text style={[styles.playerStatVal, styles.playerStatStatus]}>
                {auth.profile ? "Active" : "Guest"}
              </Text>
              <Text style={styles.playerStatLabel}>Status</Text>
            </View>
          </View>
        </View>



        {/* Next Round Widget */}
        {nextBooking && nextBookingCourse ? (
          <View style={styles.nextRoundSection}>
            <View style={styles.nextRoundHeader}>
              <Text style={styles.kicker}>UP NEXT</Text>
              <Text style={styles.nextRoundTitle}>Your Upcoming Tee Time</Text>
            </View>
            <View style={styles.nextRoundCard}>
              <View style={styles.nextRoundCardBody}>
                <View style={styles.nextRoundCourseRow}>
                  <Ionicons name="golf" size={16} color={theme.colors.primary} style={styles.nextRoundIcon} />
                  <Text style={styles.nextRoundCourseName} numberOfLines={1}>
                    {nextBookingCourse.title}
                  </Text>
                </View>
                
                <View style={styles.nextRoundTimeRow}>
                  <Ionicons name="calendar-outline" size={14} color={theme.colors.textSoft} style={styles.nextRoundIcon} />
                  <Text style={styles.nextRoundTimeText}>
                    {formatBookingDateTime(nextBooking)}
                  </Text>
                </View>

                <View style={styles.nextRoundPlayersRow}>
                  <Ionicons name="people-outline" size={14} color={theme.colors.textSoft} style={styles.nextRoundIcon} />
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
                    <Ionicons name="map-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.nextRoundBtnTextSecondary}>Directions</Text>
                  </Pressable>
                  
                  <Pressable
                    style={[styles.nextRoundBtn, styles.nextRoundBtnPrimary]}
                    onPress={() => router.push({
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
            <View style={styles.nextRoundCardEmpty}>
              <View style={styles.nextRoundEmptyContent}>
                <Ionicons name="golf-outline" size={28} color={theme.colors.muted} />
                <View style={styles.nextRoundEmptyTextCol}>
                  <Text style={styles.nextRoundEmptyTitle}>No Upcoming Tee Times</Text>
                  <Text style={styles.nextRoundEmptyDesc}>Ready for a round? Book a signature green nearby.</Text>
                </View>
              </View>
              <Pressable
                style={styles.nextRoundEmptyBookBtn}
                onPress={() => router.push("/explore")}
                variant="cta"
              >
                <Text style={styles.nextRoundEmptyBookBtnText}>Book Now</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.heroShell}>
          <ScrollView
            ref={heroScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            decelerationRate="fast"
            snapToInterval={heroCardWidth}
            snapToAlignment="start"
            disableIntervalMomentum
            onScrollBeginDrag={pauseHeroAutoplay}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(event) => {
              const loopIndex = Math.round(event.nativeEvent.contentOffset.x / heroCardWidth);

              if (loopIndex <= 0) {
                activeHeroIndexRef.current = HERO_SLIDES.length - 1;
                animateHeroIndicator(activeHeroIndexRef.current);
                jumpToHeroLoopIndex(HERO_SLIDES.length);
                return;
              }

              if (loopIndex >= HERO_LOOP_SLIDES.length - 1) {
                activeHeroIndexRef.current = 0;
                animateHeroIndicator(0);
                jumpToHeroLoopIndex(1);
                return;
              }

              activeHeroLoopIndexRef.current = loopIndex;
              activeHeroIndexRef.current = loopIndex - 1;
              animateHeroIndicator(activeHeroIndexRef.current);
            }}
          >
            {HERO_LOOP_SLIDES.map((slide, index) => (
              <View key={`${slide.id}-${index}`} style={[styles.heroCard, { width: heroCardWidth, height: heroCardHeight }]}>
                <AppImage
                  source={slide.image}
                  style={styles.heroImage}
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
                  <Pressable style={styles.bookButton} onPress={() => router.push(slide.route)} variant="cta">
                    <Text style={styles.bookButtonText}>{slide.cta}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.heroDots}>
            {HERO_SLIDES.map((slide, index) => (
              <HeroIndicatorDot key={slide.id} index={index} activeIndex={heroIndicatorIndex} />
            ))}
          </View>
        </View>

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
              router.push({
                pathname: "/explore",
                params: { section: "all-courses", scrollOffset: String(EXPLORE_SCROLL_OFFSET) },
              })
            }
            variant="chip"
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
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

        <FavoriteCoursesSection
          courses={favoriteCourses}
          onPressCourse={openCourseDetails}
          onPressViewAll={() => router.push("/favourites")}
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
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
                onPress={() => openCourseDetails(course.id)}
              />
            ))}
          </ScrollView>
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
                style={styles.getawaySquareCard}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.page,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 140,
  },
  heroShell: {
    marginBottom: 28,
  },
  heroCard: {
    borderRadius: 18,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
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
    color: theme.colors.accentSoft,
    backgroundColor: theme.colors.primary,
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
    color: theme.colors.surface,
    marginBottom: 6,
  },
  heroTitleCompact: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
  },
  heroSubtitle: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textOnPrimarySoft,
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
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  bookButtonText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    fontWeight: "700",
    color: theme.colors.surface,
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
    backgroundColor: theme.colors.borderStrong,
    shadowColor: theme.colors.primary,
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
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  viewAllText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  kicker: {
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: theme.typography.label.fontWeight,
    color: theme.colors.accentWarm,
    letterSpacing: theme.typography.label.letterSpacing,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: theme.typography.h4.fontSize,
    lineHeight: theme.typography.h4.lineHeight,
    fontWeight: theme.typography.h4.fontWeight,
    color: theme.colors.text,
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
    color: theme.colors.text,
  },
  trendingSubtitle: {
    marginTop: 4,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
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
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
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
    backgroundColor: theme.colors.overlay,
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
    color: theme.colors.surface,
    fontWeight: theme.typography.title.fontWeight,
  },
  getawaySquarePlace: {
    marginTop: 2,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textOnPrimarySoft,
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
    color: theme.colors.accentWarm,
    letterSpacing: theme.typography.overline.letterSpacing,
    marginBottom: 2,
  },
  welcomeTitle: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.text,
  },
  playerCard: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    padding: 16,
    marginBottom: 20,
    shadowColor: theme.colors.shadow,
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
    borderBottomColor: theme.colors.borderSoft,
    paddingBottom: 12,
    marginBottom: 12,
  },
  playerCardLabel: {
    fontSize: theme.typography.overline.fontSize,
    lineHeight: theme.typography.overline.lineHeight,
    fontWeight: theme.typography.overline.fontWeight,
    color: theme.colors.textSoft,
    letterSpacing: theme.typography.overline.letterSpacing,
    marginBottom: 2,
  },
  playerCardTier: {
    fontSize: theme.typography.title.fontSize,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  tierIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
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
    color: theme.colors.primary,
  },
  playerStatStatus: {
    color: theme.colors.accentWarm,
  },
  playerStatLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: theme.typography.caption.fontWeight,
    color: theme.colors.textSoft,
  },
  playerStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.borderSoft,
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    shadowColor: theme.colors.shadow,
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
    color: theme.colors.text,
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
    color: theme.colors.text,
  },
  nextRoundCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    shadowColor: theme.colors.shadow,
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
    color: theme.colors.primary,
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
    color: theme.colors.textSoft,
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
    backgroundColor: theme.colors.primary,
  },
  nextRoundBtnSecondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
  },
  nextRoundBtnTextPrimary: {
    color: theme.colors.surface,
    fontWeight: "700",
    fontSize: theme.typography.bodySm.fontSize,
  },
  nextRoundBtnTextSecondary: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: theme.typography.bodySm.fontSize,
  },
  nextRoundCardEmpty: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
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
    color: theme.colors.text,
  },
  nextRoundEmptyDesc: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
  },
  nextRoundEmptyBookBtn: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  nextRoundEmptyBookBtnText: {
    color: theme.colors.surface,
    fontWeight: "700",
    fontSize: theme.typography.bodySm.fontSize,
  },
});
