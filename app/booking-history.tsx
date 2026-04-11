import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { getCourseById } from "../components/course-data";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";

const HISTORY_ITEMS = [
  { id: "4", date: "September 28, 2023", score: "84", result: "Completed", spend: "240", highlight: "Sunny morning round" },
  { id: "5", date: "September 15, 2023", score: "79", result: "Completed", spend: "195", highlight: "Best back-nine finish" },
  { id: "6", date: "August 30, 2023", score: "82", result: "Completed", spend: "210", highlight: "Windy coastal conditions" },
  { id: "3", date: "August 12, 2023", score: "70", result: "Top Round", spend: "260", highlight: "Personal season best" },
] as const;

export default function BookingHistoryScreen() {
  const router = useRouter();
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: Math.max(screenBottomPadding - 20, 120) },
        ]}
        bounces={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>PAST ROUNDS</Text>
            <Text style={styles.summaryValue}>{HISTORY_ITEMS.length} bookings completed</Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryMetricLabel}>AVG SCORE</Text>
            <Text style={styles.summaryMetricValue}>78.8</Text>
          </View>
        </View>

        <View style={styles.list}>
          {HISTORY_ITEMS.map((item) => {
            const course = getCourseById(item.id);

            return (
              <Pressable
                key={`${item.id}-${item.date}`}
                style={styles.historyCard}
                onPress={() => router.push({ pathname: "/course-details", params: { id: course.id } })}
                variant="card"
              >
                <View style={styles.historyImageWrap}>
                  <AppImage source={{ uri: course.image }} style={styles.historyImage} />
                  <View style={styles.historyOverlay} />
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.result.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.historyBody}>
                  <View style={styles.historyTopRow}>
                    <View style={styles.historyTitleWrap}>
                      <Text style={styles.historyTitle}>{course.title}</Text>
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={13} color={theme.colors.textSoft} />
                        <Text style={styles.locationText}>{course.location}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
                  </View>

                  <View style={styles.metaPanel}>
                    <View>
                      <Text style={styles.metaLabel}>DATE</Text>
                      <Text style={styles.metaValue}>{item.date}</Text>
                    </View>
                    <View>
                      <Text style={styles.metaLabel}>SCORE</Text>
                      <Text style={styles.metaValue}>{item.score}</Text>
                    </View>
                    <View>
                      <Text style={styles.metaLabel}>SPEND</Text>
                      <Text style={styles.metaValue}>${item.spend}</Text>
                    </View>
                  </View>

                  <Text style={styles.highlightText}>{item.highlight}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.page,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },
  summaryCard: {
    borderRadius: 20,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  summaryLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  summaryMetric: {
    alignItems: "flex-end",
  },
  summaryMetricLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.accentWarm,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryMetricValue: {
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  list: {
    gap: 14,
  },
  historyCard: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyImageWrap: {
    height: 156,
    position: "relative",
  },
  historyImage: {
    width: "100%",
    height: "100%",
  },
  historyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlaySoft,
  },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.glass,
    justifyContent: "center",
  },
  badgeText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
    letterSpacing: 1,
  },
  historyBody: {
    padding: 14,
    gap: 12,
  },
  historyTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  historyTitleWrap: {
    flex: 1,
    gap: 5,
  },
  historyTitle: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
  },
  metaPanel: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  metaLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.accentWarm,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
    fontWeight: "700",
  },
  highlightText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
  },
});
