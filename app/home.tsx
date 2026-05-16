import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
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
import { useCourseCatalog } from "../components/course-management";
import { FavoriteCoursesSection } from "../components/favorite-courses-section";
import { useFavoriteCourseIds } from "../components/favorites";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";
import { getCourseImage } from "../lib/image-mapping";

const HERO_NEWS_IMAGE = require("../assets/images/home-hero-news.jpg");
const HERO_OFFER_IMAGE = require("../assets/images/home-hero-offer.jpg");
const HERO_MEMBER_IMAGE = require("../assets/images/home-hero-member.jpg");

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
    fontWeight: "700",
    color: theme.colors.accentSoft,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 10,
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: "800",
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
    fontWeight: "700",
    color: theme.colors.accentWarm,
    letterSpacing: 2.4,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: theme.typography.h1.fontSize,
    lineHeight: theme.typography.h1.lineHeight,
    fontWeight: "800",
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
    fontSize: theme.typography.h1.fontSize,
    lineHeight: theme.typography.h1.lineHeight,
    fontWeight: "800",
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
  trendingCard: {
    width: 316,
  },
  trendingCardTablet: {
    width: 316,
  },
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
    fontWeight: "700",
  },
  getawaySquarePlace: {
    marginTop: 2,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textOnPrimarySoft,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
});
