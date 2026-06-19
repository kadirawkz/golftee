import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import {
  formatBookingDateTime,
  getBookingTotal,
  isHistoricalBooking,
  isUpcomingBooking,
  useBookingState,
  refreshBookings,
} from "../services/bookings";
import { getManagedCourseById } from "../services/course-management";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "../components/theme";
import { getCourseImage } from "../lib/image-mapping";

const SEGMENTED_CONTROL_PADDING = 4;

type WeatherInfo = {
  temp: number;
  description: string;
};

// Custom Toast component for visual feedback
function Toast({ message, visible, onHide }: { message: string; visible: boolean; onHide: () => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide();
      });
    }
  }, [visible, fadeAnim, onHide]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }]}>
      <Ionicons name="checkmark-circle" size={18} color={colors.successText} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

function WeatherWidget({ lat, lon, date }: { lat: number; lon: number; date: string }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max&timezone=auto&start_date=${date}&end_date=${date}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!active) return;
        if (data?.daily?.temperature_2m_max?.[0] !== undefined) {
          const temp = data.daily.temperature_2m_max[0];
          const code = data.daily.weathercode[0];
          let description = "Clear";
          if (code >= 1 && code <= 3) description = "Partly Cloudy";
          else if (code >= 45 && code <= 48) description = "Foggy";
          else if (code >= 51 && code <= 67) description = "Rainy";
          else if (code >= 71 && code <= 77) description = "Snowy";
          else if (code >= 80 && code <= 82) description = "Showers";
          else if (code >= 95) description = "Stormy";

          setWeather({ temp, description });
        }
      } catch (err) {
        console.warn("Weather fetch failed", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchWeather();
    return () => {
      active = false;
    };
  }, [lat, lon, date]);

  if (loading) {
    return (
      <View style={styles.weatherRow}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.weatherText}>Fetching weather forecast...</Text>
      </View>
    );
  }

  if (!weather) return null;

  // Choose icon based on weather description
  let weatherIcon: "sunny" | "cloudy" | "rainy" | "thunderstorm" | "snow" = "sunny";
  if (weather.description.includes("Cloudy") || weather.description.includes("Foggy")) {
    weatherIcon = "cloudy";
  } else if (weather.description.includes("Rainy") || weather.description.includes("Showers")) {
    weatherIcon = "rainy";
  } else if (weather.description.includes("Stormy")) {
    weatherIcon = "thunderstorm";
  } else if (weather.description.includes("Snowy")) {
    weatherIcon = "snow";
  }

  return (
    <View style={styles.weatherRow}>
      <Ionicons name={weatherIcon} size={14} color={colors.accentWarm} />
      <Text style={styles.weatherText}>
        Forecast: {weather.temp}°C • {weather.description}
      </Text>
    </View>
  );
}

function BookingCard({
  booking,
  onPressManage,
  showToast,
}: {
  booking: any;
  onPressManage: (bookingId: string) => void;
  showToast: (msg: string) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const router = useRouter();
  const course = getManagedCourseById(booking.course_id);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Tee time booked at ${course.title} on ${formatBookingDateTime(booking)} for ${booking.players} players. Let's play!`,
      });
      showToast("Tee time details shared!");
    } catch (err) {
      console.warn("Share failed", err);
    }
  };

  const handleGetDirections = () => {
    const lat = course.coordinates?.latitude ?? 6.9271;
    const lon = course.coordinates?.longitude ?? 79.8612;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    Linking.openURL(url);
    showToast("Opening directions in Maps...");
  };

  const handleAddToCalendar = () => {
    const start = new Date(`${booking.tee_date}T${booking.tee_time}`);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000); // 4 hour duration
    const formatUtc = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      "Tee Time at " + course.title
    )}&dates=${formatUtc(start)}/${formatUtc(end)}&details=${encodeURIComponent(
      "Tee time booking at " + course.title + " for " + booking.players + " players."
    )}&location=${encodeURIComponent(course.location)}`;
    Linking.openURL(calUrl);
    showToast("Opening Calendar...");
  };

  const isUpcoming = isUpcomingBooking(booking);

  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingImageWrap}>
        <AppImage source={getCourseImage(course.image)} style={styles.bookingImage} />
        <Text style={[styles.confirmedBadge, booking.status === "cancelled" && styles.cancelledBadge]}>
          {booking.status.toUpperCase()}
        </Text>
      </View>

      <View style={styles.bookingBody}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.bookingTitle}>{course.title}</Text>
          {isUpcoming && (
            <Pressable style={styles.shareButton} onPress={handleShare} variant="icon">
              <Ionicons name="share-social-outline" size={20} color={colors.primary} />
            </Pressable>
          )}
        </View>

        <View style={styles.bookingLocationRow}>
          <Ionicons name="location" size={12} color={colors.textSoft} />
          <Text style={styles.bookingLocation}>{course.location}</Text>
        </View>

        {isUpcoming && course.coordinates && (
          <WeatherWidget
            lat={course.coordinates.latitude}
            lon={course.coordinates.longitude}
            date={booking.tee_date}
          />
        )}

        <View style={styles.bookingMetaPanel}>
          <View>
            <Text style={styles.metaLabel}>DATE & TIME</Text>
            <Text style={styles.metaValue}>{formatBookingDateTime(booking)}</Text>
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLabel}>PLAYERS</Text>
            <Text style={styles.metaValue}>{booking.players} People</Text>
          </View>
        </View>

        {isUpcoming ? (
          <View style={styles.actionRow}>
            <Pressable style={[styles.actionBtn, styles.borderBtn]} onPress={handleGetDirections} variant="chip">
              <Ionicons name="map-outline" size={16} color={colors.primary} />
              <Text style={styles.actionBtnText}>Directions</Text>
            </Pressable>

            <Pressable style={[styles.actionBtn, styles.borderBtn]} onPress={handleAddToCalendar} variant="chip">
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.actionBtnText}>Calendar</Text>
            </Pressable>

            <Pressable style={[styles.actionBtn, styles.primaryBtn]} onPress={() => onPressManage(booking.id)} variant="cta">
              <Text style={styles.primaryBtnText}>Manage</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <View>
              <Text style={styles.metaLabel}>TOTAL PAID</Text>
              <Text style={styles.historyPrice}>${getBookingTotal(booking).toFixed(2)}</Text>
            </View>

            <Pressable
              style={[styles.actionBtn, styles.primaryBtn, { flex: 0, paddingHorizontal: 20 }]}
              onPress={() =>
                router.navigate({
                  pathname: "/tee-time-booking",
                  params: { id: course.id },
                })
              }
              variant="cta"
            >
              <Ionicons name="refresh" size={16} color={colors.surface} />
              <Text style={styles.primaryBtnText}>Book Again</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

export default function BookingsScreen() {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const router = useRouter();
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();
  const bookingState = useBookingState();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshBookings();
    } catch (err) {
      console.warn("Failed to refresh bookings", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const [activeTab, setActiveTab] = useState<"upcoming" | "history" | "insights">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [segmentWidth, setSegmentWidth] = useState(0);

  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const segmentProgress = useRef(new Animated.Value(0)).current;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
  }, []);

  useEffect(() => {
    let toValue = 0;
    if (activeTab === "history") toValue = 1;
    else if (activeTab === "insights") toValue = 2;

    Animated.timing(segmentProgress, {
      toValue,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeTab, segmentProgress]);

  const handleTabChange = (nextTab: "upcoming" | "history" | "insights") => {
    if (nextTab === activeTab) return;

    LayoutAnimation.configureNext({
      duration: 180,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });

    setActiveTab(nextTab);
    setSearchQuery("");
    setStatusFilter("all");
  };

  const handleManageBooking = useCallback(
    (bookingId: string) => {
      router.navigate({
        pathname: "/manage-booking",
        params: { bookingId },
      });
    },
    [router]
  );

  // Filter Bookings logic
  const upcomingBookings = useMemo(() => {
    return bookingState.bookings.filter(isUpcomingBooking);
  }, [bookingState.bookings]);

  const historyBookings = useMemo(() => {
    return bookingState.bookings.filter(isHistoricalBooking).reverse();
  }, [bookingState.bookings]);

  const filteredUpcoming = useMemo(() => {
    return upcomingBookings.filter((b) => {
      const course = getManagedCourseById(b.course_id);
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [upcomingBookings, searchQuery, statusFilter]);

  const filteredHistory = useMemo(() => {
    return historyBookings.filter((b) => {
      const course = getManagedCourseById(b.course_id);
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [historyBookings, searchQuery, statusFilter]);

  // Aggregate Insights stats
  const insightsStats = useMemo(() => {
    const completedOrPast = bookingState.bookings.filter((b) => b.status === "completed" || isHistoricalBooking(b));
    const totalSpent = completedOrPast.reduce((sum, b) => sum + getBookingTotal(b), 0);
    const roundsPlayed = completedOrPast.filter((b) => b.status === "completed" || b.status === "confirmed").length;

    // Calculate favorite course
    const counts: Record<string, number> = {};
    completedOrPast.forEach((b) => {
      counts[b.course_id] = (counts[b.course_id] || 0) + 1;
    });
    let favCourseId = "";
    let maxCount = 0;
    Object.keys(counts).forEach((cid) => {
      if (counts[cid] > maxCount) {
        maxCount = counts[cid];
        favCourseId = cid;
      }
    });

    const favCourse = favCourseId ? getManagedCourseById(favCourseId) : null;

    return {
      totalSpent,
      roundsPlayed,
      favCourse,
      favCount: maxCount,
    };
  }, [bookingState.bookings]);

  // Tab indicator translation logic
  const segmentIndicatorWidth = Math.max((segmentWidth - SEGMENTED_CONTROL_PADDING * 2) / 3, 0);
  const segmentIndicatorTranslateX = segmentProgress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, segmentIndicatorWidth, segmentIndicatorWidth * 2],
  });

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      {/* Segmented Tab Control */}
      <View style={[styles.headerContainer, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.segmentedWrap} onLayout={(e) => setSegmentWidth(e.nativeEvent.layout.width)}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.segmentIndicator,
              {
                width: segmentIndicatorWidth,
                transform: [{ translateX: segmentIndicatorTranslateX }],
              },
            ]}
          />
          <Pressable
            style={[styles.segmentButton, activeTab === "upcoming" && styles.segmentButtonActive]}
            onPress={() => handleTabChange("upcoming")}
            variant="tab"
          >
            <Text style={[styles.segmentText, activeTab === "upcoming" && styles.segmentTextActive]}>Upcoming</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, activeTab === "history" && styles.segmentButtonActive]}
            onPress={() => handleTabChange("history")}
            variant="tab"
          >
            <Text style={[styles.segmentText, activeTab === "history" && styles.segmentTextActive]}>History</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, activeTab === "insights" && styles.segmentButtonActive]}
            onPress={() => handleTabChange("insights")}
            variant="tab"
          >
            <Text style={[styles.segmentText, activeTab === "insights" && styles.segmentTextActive]}>Insights</Text>
          </Pressable>
        </View>
      </View>

      {/* Filter / Search Bar for lists */}
      {activeTab !== "insights" && (
        <View style={[styles.searchFilterContainer, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={18} color={colors.muted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by course or location..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} variant="icon">
                <Ionicons name="close-circle" size={16} color={colors.muted} />
              </Pressable>
            )}
          </View>

          {/* Quick Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
            <Pressable
              style={[styles.filterChip, statusFilter === "all" && styles.filterChipActive]}
              onPress={() => setStatusFilter("all")}
              variant="chip"
            >
              <Text style={[styles.filterChipText, statusFilter === "all" && styles.filterChipTextActive]}>All Status</Text>
            </Pressable>
            <Pressable
              style={[styles.filterChip, statusFilter === "confirmed" && styles.filterChipActive]}
              onPress={() => setStatusFilter("confirmed")}
              variant="chip"
            >
              <Text style={[styles.filterChipText, statusFilter === "confirmed" && styles.filterChipTextActive]}>Confirmed</Text>
            </Pressable>
            <Pressable
              style={[styles.filterChip, statusFilter === "cancelled" && styles.filterChipActive]}
              onPress={() => setStatusFilter("cancelled")}
              variant="chip"
            >
              <Text style={[styles.filterChipText, statusFilter === "cancelled" && styles.filterChipTextActive]}>Cancelled</Text>
            </Pressable>
            {activeTab === "history" && (
              <Pressable
                style={[styles.filterChip, statusFilter === "completed" && styles.filterChipActive]}
                onPress={() => setStatusFilter("completed")}
                variant="chip"
              >
                <Text style={[styles.filterChipText, statusFilter === "completed" && styles.filterChipTextActive]}>Completed</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: screenBottomPadding },
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
      >
        {bookingState.loading && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
        )}

        {/* Tab 1: Upcoming */}
        {activeTab === "upcoming" && !bookingState.loading && (
          <View style={styles.sectionWrap}>
            {filteredUpcoming.length > 0 ? (
              filteredUpcoming.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onPressManage={handleManageBooking}
                  showToast={showToast}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color={colors.muted} />
                <Text style={styles.emptyTextTitle}>No upcoming bookings</Text>
                <Text style={styles.emptyTextDesc}>Book a tee time now and enjoy your game.</Text>
                <Pressable
                  style={styles.bookTeeTimeBtn}
                  onPress={() => router.navigate("/home")}
                  variant="cta"
                >
                  <Text style={styles.bookTeeTimeText}>Book a Tee Time</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Tab 2: History */}
        {activeTab === "history" && !bookingState.loading && (
          <View style={styles.sectionWrap}>
            {filteredHistory.length > 0 ? (
              filteredHistory.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onPressManage={handleManageBooking}
                  showToast={showToast}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="journal-outline" size={48} color={colors.muted} />
                <Text style={styles.emptyTextTitle}>No history found</Text>
                <Text style={styles.emptyTextDesc}>Your completed or cancelled rounds will appear here.</Text>
              </View>
            )}
          </View>
        )}

        {/* Tab 3: Insights Dashboard */}
        {activeTab === "insights" && (
          <View style={styles.insightsContainer}>
            <Text style={styles.insightsHeadline}>Your Performance & Stats</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Ionicons name="golf-outline" size={24} color={colors.primary} />
                <Text style={styles.statNumber}>{insightsStats.roundsPlayed}</Text>
                <Text style={styles.statLabel}>Rounds Played</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="card-outline" size={24} color={colors.accentWarm} />
                <Text style={styles.statNumber}>${insightsStats.totalSpent.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Total Spend</Text>
              </View>
            </View>

            {insightsStats.favCourse ? (
              <View style={styles.favoriteCourseCard}>
                <Text style={styles.favoriteCourseTag}>FAVOURITE COURSE</Text>
                <AppImage source={getCourseImage(insightsStats.favCourse.image)} style={styles.favCourseImage} />
                <View style={styles.favCourseDetails}>
                  <Text style={styles.favCourseTitle}>{insightsStats.favCourse.title}</Text>
                  <Text style={styles.favCourseLocation}>{insightsStats.favCourse.location}</Text>
                  <View style={styles.favCourseStatRow}>
                    <Ionicons name="repeat" size={14} color={colors.accentWarm} />
                    <Text style={styles.favCourseStatText}>Played {insightsStats.favCount} times</Text>
                  </View>
                  <Pressable
                    style={styles.bookFavBtn}
                    onPress={() =>
                      router.navigate({
                        pathname: "/tee-time-booking",
                        params: { id: insightsStats.favCourse!.id },
                      })
                    }
                    variant="cta"
                  >
                    <Text style={styles.bookFavText}>Book Again</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="analytics-outline" size={48} color={colors.muted} />
                <Text style={styles.emptyTextTitle}>Insights Unavailable</Text>
                <Text style={styles.emptyTextDesc}>Complete some rounds to see your personal statistics here.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Toast Notification */}
      <Toast message={toastMessage} visible={toastVisible} onHide={() => setToastVisible(false)} />
    </SafeAreaView>
  );
}

const themedStyles = createThemedStyleSheet((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  scrollContent: {
    paddingTop: 10,
    gap: 16,
  },
  segmentedWrap: {
    position: "relative",
    flexDirection: "row",
    borderRadius: 16,
    padding: SEGMENTED_CONTROL_PADDING,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  segmentIndicator: {
    position: "absolute",
    top: SEGMENTED_CONTROL_PADDING,
    bottom: SEGMENTED_CONTROL_PADDING,
    left: SEGMENTED_CONTROL_PADDING,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentButton: {
    flex: 1,
    borderRadius: theme.radius.pill,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  segmentButtonActive: {
    backgroundColor: "transparent",
  },
  segmentText: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "600",
    color: colors.textSoft,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  searchFilterContainer: {
    marginTop: 8,
    gap: 8,
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: theme.typography.body.fontSize,
    paddingVertical: 0,
  },
  filterChipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: theme.typography.bodySm.fontSize,
    color: colors.textSoft,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  sectionWrap: {
    gap: 16,
  },
  bookingCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  bookingImageWrap: {
    height: 110,
    position: "relative",
  },
  bookingImage: {
    width: "100%",
    height: "100%",
  },
  confirmedBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: colors.primary,
    color: colors.surface,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: "700",
    letterSpacing: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  cancelledBadge: {
    backgroundColor: colors.danger,
  },
  bookingBody: {
    padding: 16,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  bookingLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bookingLocation: {
    fontSize: theme.typography.bodySm.fontSize,
    color: colors.textSoft,
  },
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  weatherText: {
    fontSize: theme.typography.bodySm.fontSize,
    color: colors.primary,
    fontWeight: "600",
  },
  bookingMetaPanel: {
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaRight: {
    alignItems: "flex-end",
  },
  metaLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: colors.accentWarm,
    letterSpacing: 0.9,
    fontWeight: "700",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: theme.typography.body.fontSize,
    color: colors.text,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: theme.radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  borderBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: "transparent",
  },
  primaryBtn: {
    backgroundColor: colors.primary,
  },
  actionBtnText: {
    fontSize: theme.typography.bodySm.fontSize,
    fontWeight: "700",
    color: colors.primary,
  },
  primaryBtnText: {
    fontSize: theme.typography.bodySm.fontSize,
    fontWeight: "700",
    color: colors.surface,
  },
  historyPrice: {
    fontSize: theme.typography.title.fontSize,
    color: colors.accentWarm,
    fontWeight: "800",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyTextTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
  },
  emptyTextDesc: {
    fontSize: theme.typography.body.fontSize,
    color: colors.textSoft,
    textAlign: "center",
    maxWidth: 240,
  },
  bookTeeTimeBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  bookTeeTimeText: {
    color: colors.surface,
    fontSize: theme.typography.body.fontSize,
    fontWeight: "700",
  },
  insightsContainer: {
    gap: 16,
  },
  insightsHeadline: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: "800",
    color: colors.text,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: theme.typography.displayS.fontSize,
    fontWeight: "900",
    color: colors.primary,
  },
  statLabel: {
    fontSize: theme.typography.bodySm.fontSize,
    color: colors.textSoft,
    fontWeight: "600",
  },
  favoriteCourseCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    overflow: "hidden",
  },
  favoriteCourseTag: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: colors.accentSoft,
    color: colors.accentWarm,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    zIndex: 1,
  },
  favCourseImage: {
    width: "100%",
    height: 160,
  },
  favCourseDetails: {
    padding: 16,
    gap: 8,
  },
  favCourseTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: "800",
    color: colors.text,
  },
  favCourseLocation: {
    fontSize: theme.typography.bodySm.fontSize,
    color: colors.textSoft,
  },
  favCourseStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  favCourseStatText: {
    fontSize: theme.typography.bodySm.fontSize,
    color: colors.textSoft,
    fontWeight: "700",
  },
  bookFavBtn: {
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  bookFavText: {
    color: colors.surface,
    fontSize: theme.typography.body.fontSize,
    fontWeight: "700",
  },
  toastContainer: {
    position: "absolute",
    bottom: 110,
    alignSelf: "center",
    backgroundColor: colors.success,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    fontSize: theme.typography.bodySm.fontSize,
    fontWeight: "700",
    color: colors.successText,
  },
}));
