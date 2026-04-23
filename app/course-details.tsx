import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { InteractionManager, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { getManagedCourseById, useCourseDetails } from "../components/course-management";
import { toggleFavoriteCourse, useIsFavoriteCourse } from "../components/favorites";
import { openInGoogleMaps } from "../components/map-links";
import { theme } from "../components/theme";
import { DailyWeatherForecast, getFourteenDayForecast, getWeatherCodeIconName } from "../components/weather";

interface CourseReview {
  id: string;
  author: string;
  handicap: string;
  rating: number;
  text: string;
  date: string;
}

interface Amenity {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

const amenities: Amenity[] = [
  { icon: "home", title: "Clubhouse", subtitle: "Panoramic Views" },
  { icon: "bag", title: "Pro Shop", subtitle: "Premium Gear" },
  { icon: "restaurant", title: "Dining", subtitle: "Fine Gastronomy" },
  { icon: "car", title: "Carts", subtitle: "GPS Integrated" },
];

const courseReviews: CourseReview[] = [
  {
    id: "1",
    author: "Marcus Thorne",
    handicap: "Handicap: 4",
    rating: 5,
    text: "The most immersive golfing experience I've had in years. The layout between the 9th and 10th hole is a masterclass in landscape design.",
    date: "Mar 12, 2026",
  },
  {
    id: "2",
    author: "Elena Rodriguez",
    handicap: "Executive Member",
    rating: 5,
    text: "Clubhouse amenities are second to none. After a challenging 18 holes, the dining experience overlooking the valley was pure luxury.",
    date: "Feb 27, 2026",
  },
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const fallbackExperienceDescription =
  "Designed by master architects to harmonize with the natural contours, this course offers an 18-hole journey that challenges the professional while enchanting the amateur. The rolling bentgrass fairways blend seamlessly into pristine bunkers, framed by age-old oaks and strategic water hazards.";

function formatReviewDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function AmenityCard({ icon, title, subtitle }: Amenity) {
  return (
    <View style={styles.amenityCard}>
      <View style={styles.amenityIcon}>
        <Ionicons name={icon} size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.amenityContent}>
        <Text style={styles.amenityTitle}>{title}</Text>
        <Text style={styles.amenitySubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function ReviewCard({ author, handicap, rating, text, date }: Omit<CourseReview, "id">) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTopRow}>
        <View style={styles.ratingWrap}>
          {[...Array(rating)].map((_, i) => (
            <Ionicons key={i} name="star" size={12} color={theme.colors.accentWarm} />
          ))}
        </View>
        <Text style={styles.reviewDate}>{date}</Text>
      </View>
      <Text style={styles.reviewText}>{text}</Text>
      <View style={styles.reviewAuthor}>
        <View style={styles.authorAvatar}>
          <Ionicons name="person-circle" size={32} color={theme.colors.muted} />
        </View>
        <View>
          <Text style={styles.authorName}>{author}</Text>
          <Text style={styles.authorMeta}>{handicap}</Text>
        </View>
      </View>
    </View>
  );
}

export default function CourseDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const courseId = Array.isArray(id) ? id[0] : id;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [weather, setWeather] = useState<DailyWeatherForecast[]>([]);
  const [weatherState, setWeatherState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [favoriteNotice, setFavoriteNotice] = useState<string | null>(null);
  const course = getManagedCourseById(courseId);
  const courseDetails = useCourseDetails(course.id);
  const isFavorite = useIsFavoriteCourse(course.id);
  const isCompact = width < 360;
  const isTabletLike = width >= 768;
  const tabHeight = isTabletLike ? 74 : isCompact ? 62 : 68;
  const tabBottom = Math.max(insets.bottom + 6, 8);
  const bookingHorizontalInset = isTabletLike ? Math.max((width - 560) / 2, 24) : isCompact ? 12 : 16;
  const bookingBottom = tabBottom + tabHeight + (isCompact ? 10 : 12);
  const bookingMinHeight = isTabletLike ? 76 : isCompact ? 68 : 72;
  const scrollBottomPadding = bookingBottom + bookingMinHeight + 28;
  const amenityItems = (courseDetails.value?.detailItems ?? [])
    .filter((item) => item.category === "amenity")
    .map((item) => ({
      icon: item.icon as keyof typeof Ionicons.glyphMap,
      title: item.title,
      subtitle: item.subtitle,
    }));
  const highlightItems = (courseDetails.value?.detailItems ?? [])
    .filter((item) => item.category === "highlight")
    .map((item) => ({
      icon: item.icon as keyof typeof Ionicons.glyphMap,
      title: item.title,
      subtitle: item.subtitle,
    }));
  const resolvedAmenities = amenityItems.length ? amenityItems : amenities;
  const resolvedHighlights = highlightItems.length
    ? highlightItems
    : [
        { icon: "leaf" as const, title: "Pristine Turf Management", subtitle: "Tee-to-green perfection daily." },
        { icon: "water" as const, title: "Strategic Water Hazards", subtitle: "Engineered for risk and reward play." },
      ];
  const resolvedReviews = courseDetails.value?.reviews.length
    ? courseDetails.value.reviews.map((review) => ({
        id: review.id,
        author: review.author_name,
        handicap: review.author_badge,
        rating: review.rating,
        text: review.review_text,
        date: formatReviewDate(review.review_date),
      }))
    : courseReviews;
  const visibleReviews = showAllReviews ? resolvedReviews : resolvedReviews.slice(0, 1);
  const heroBadge = courseDetails.value?.content?.hero_badge ?? "SIGNATURE COURSE";
  const reviewCount = courseDetails.value?.content?.review_count ?? 128;
  const experienceDescription = courseDetails.value?.content?.experience_description ?? fallbackExperienceDescription;

  useEffect(() => {
    let active = true;
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      const loadWeather = async () => {
        setWeatherState("loading");
        setWeatherError(null);

        try {
          const forecast = await getFourteenDayForecast(course.coordinates);
          if (!active) {
            return;
          }

          setWeather(forecast);
          setWeatherState("success");
        } catch (error) {
          if (!active) {
            return;
          }

          const message = error instanceof Error ? error.message : "Weather forecast unavailable.";
          const normalizedMessage =
            message === "weather_unavailable"
              ? "Weather forecast is unavailable for this location right now."
              : "Unable to load 14-day weather right now.";

          setWeatherState("error");
          setWeatherError(normalizedMessage);
        }
      };

      void loadWeather();
    });

    return () => {
      active = false;
      interactionTask.cancel();
    };
  }, [course.coordinates, course.id]);

  const handleFavoriteToggle = async () => {
    try {
      setFavoriteNotice(null);
      await toggleFavoriteCourse(course.id);
    } catch (error) {
      setFavoriteNotice(error instanceof Error ? error.message : "Unable to update favourites right now.");
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.heroSection}>
          <AppImage source={{ uri: course.image }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <Pressable
            style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
            onPress={() => void handleFavoriteToggle()}
            variant="icon"
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={isFavorite ? theme.colors.surface : theme.colors.primary}
            />
          </Pressable>
          <View style={styles.heroContent}>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{heroBadge}</Text>
            </View>
            <Text style={styles.courseTitle}>{course.title}</Text>
            <View style={styles.heroLocationPill}>
              <Ionicons name="location" size={14} color={theme.colors.surface} />
              <Text style={styles.heroLocationText}>{course.location}</Text>
            </View>
            <View style={styles.courseMetaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="star" size={14} color={theme.colors.accentWarm} />
                <Text style={styles.metaText}>{course.rating} ({reviewCount} Reviews)</Text>
              </View>
              <View style={styles.metaDot} />
              <Pressable
                style={styles.metaMapButton}
                onPress={() =>
                  openInGoogleMaps({
                    coordinates: course.coordinates,
                    placeQuery: course.placeQuery,
                    placeId: course.placeId,
                  })
                }
                variant="chip"
              >
                <Ionicons name="map-outline" size={14} color={theme.colors.surface} />
                <Text style={styles.metaMapButtonText}>Open in Map</Text>
              </Pressable>
            </View>
            {favoriteNotice ? <Text style={styles.favoriteNotice}>{favoriteNotice}</Text> : null}
          </View>
        </View>

        <View style={styles.contentSection}>
          {courseDetails.error ? <Text style={styles.weatherStateText}>{courseDetails.error}</Text> : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>14-Day Weather</Text>
              <Text style={styles.sectionMeta}>Forecast</Text>
            </View>

            {weatherState === "loading" ? (
              <Text style={styles.weatherStateText}>Loading weather forecast...</Text>
            ) : null}

            {weatherState === "error" ? (
              <Text style={styles.weatherStateText}>{weatherError}</Text>
            ) : null}

            {weatherState === "success" ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.weatherRow}
                bounces={false}
                overScrollMode="never"
              >
                {weather.map((day) => (
                  <View key={day.dateLabel} style={styles.weatherCard}>
                    <Text style={styles.weatherDate}>{day.dateLabel}</Text>
                    <View style={styles.weatherIconWrap}>
                      <Ionicons
                        name={getWeatherCodeIconName(day.weatherCode)}
                        size={20}
                        color={theme.colors.accentWarm}
                      />
                    </View>
                    <Text style={styles.weatherTemp}>{`${day.tempMax}\u00B0`}</Text>
                    <Text style={styles.weatherMinTemp}>{`${day.tempMin}\u00B0 low`}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>World-Class Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {resolvedAmenities.map((amenity, idx) => (
                <AmenityCard key={`${amenity.title}-${idx}`} {...amenity} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.experienceHeader}>
              <View style={styles.experienceTitleWrap}>
                <Text style={styles.sectionTitle}>The Fairway Experience</Text>
                <View style={styles.underline} />
              </View>
            </View>
            <Text style={styles.experienceText}>{experienceDescription}</Text>

            <View style={styles.featuresWrap}>
              {resolvedHighlights.map((highlight, idx) => (
                <View key={`${highlight.title}-${idx}`} style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={highlight.icon} size={18} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.featureTitle}>{highlight.title}</Text>
                    <Text style={styles.featureSubtitle}>{highlight.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              style={styles.mapActionButton}
              onPress={() =>
                openInGoogleMaps({
                  coordinates: course.coordinates,
                  placeQuery: course.placeQuery,
                  placeId: course.placeId,
                })
              }
              variant="button"
            >
              <Ionicons name="navigate-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.mapActionText}>Open in Google Maps</Text>
            </Pressable>

            <View style={styles.courseImageWrap}>
              <AppImage source={{ uri: course.image }} style={styles.courseImage} />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Player Memoirs</Text>
            </View>

            <View style={styles.reviewsList}>
              {visibleReviews.map((review) => (
                <ReviewCard key={review.id} {...review} />
              ))}
            </View>

            {resolvedReviews.length > 1 ? (
              <Pressable style={styles.showMoreButton} onPress={() => setShowAllReviews((value) => !value)} variant="chip">
                <Text style={styles.showMoreButtonText}>{showAllReviews ? "Show Less" : "Show More"}</Text>
                <Ionicons
                  name={showAllReviews ? "chevron-up" : "chevron-down"}
                  size={15}
                  color={theme.colors.primary}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.floatingBooking,
          {
            left: bookingHorizontalInset,
            right: bookingHorizontalInset,
            bottom: bookingBottom,
            minHeight: bookingMinHeight,
          },
        ]}
      >
        <View style={[styles.bookingContent, isCompact && styles.bookingContentCompact]}>
          <View style={styles.bookingPriceWrap}>
            <Text style={styles.bookingLabel}>Starting at</Text>
            <Text style={styles.bookingPrice}>
              {course.price}
              <Text style={styles.bookingPriceSuffix}> / player</Text>
            </Text>
          </View>
          <Pressable
            style={[styles.bookButton]}
            onPress={() => router.push({ pathname: "/tee-time-booking", params: { id: course.id } })}
            variant="cta"
          >
            <Text style={styles.bookButtonText}>Book Tee Time</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.surface} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 200,
  },
  heroSection: {
    height: 380,
    position: "relative",
    marginBottom: 20,
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
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: 10,
  },
  favoriteButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 12,
  },
  favoriteButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  badgePill: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.accentWarm,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  courseTitle: {
    fontSize: theme.typography.displayL.fontSize,
    lineHeight: theme.typography.displayL.lineHeight,
    color: theme.colors.surface,
    fontWeight: "800",
    marginBottom: 10,
  },
  heroLocationPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
    marginBottom: 10,
  },
  heroLocationText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.surface,
    fontWeight: "600",
  },
  courseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textOnPrimaryStrong,
    fontWeight: "500",
  },
  metaMapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaMapButtonText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.surface,
    fontWeight: "600",
  },
  favoriteNotice: {
    marginTop: 8,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textOnPrimaryStrong,
    fontWeight: "600",
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textOnPrimaryDim,
  },
  contentSection: {
    paddingHorizontal: 16,
    gap: 28,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "700",
  },
  sectionMeta: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    letterSpacing: 1,
    fontWeight: "700",
  },
  weatherStateText: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "500",
  },
  weatherRow: {
    gap: 10,
    paddingRight: 8,
  },
  weatherCard: {
    width: 78,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceTint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  weatherDate: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "700",
  },
  weatherIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  weatherTemp: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  weatherMinTemp: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "600",
  },
  amenitiesGrid: {
    gap: 12,
  },
  amenityCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "flex-start",
  },
  amenityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  amenityContent: {
    flex: 1,
    gap: 2,
  },
  amenityTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  amenitySubtitle: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
  },
  experienceHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  experienceTitleWrap: {
    gap: 4,
  },
  underline: {
    width: 50,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
  },
  experienceText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textSoft,
    marginTop: 8,
  },
  featuresWrap: {
    gap: 16,
    marginTop: 12,
  },
  featureItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  featureSubtitle: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
    marginTop: 2,
  },
  courseImageWrap: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 16,
    height: 280,
  },
  mapActionButton: {
    marginTop: 4,
    height: 48,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapActionText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  courseImage: {
    width: "100%",
    height: "100%",
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  showMoreButtonText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  reviewsList: {
    gap: 12,
  },
  reviewCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  reviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  ratingWrap: {
    flexDirection: "row",
    gap: 3,
  },
  reviewDate: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
  reviewText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
    fontStyle: "italic",
  },
  reviewAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  authorName: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  authorMeta: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
  floatingBooking: {
    position: "absolute",
    left: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  bookingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  bookingContentCompact: {
    gap: 10,
  },
  bookingPriceWrap: {
    flex: 1,
  },
  bookingLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
    fontWeight: "700",
    letterSpacing: 1,
  },
  bookingPrice: {
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  bookingPriceSuffix: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
    fontWeight: "500",
  },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  bookButtonText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.surface,
    fontWeight: "700",
  },
});
