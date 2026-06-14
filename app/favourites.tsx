import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCourseCatalog } from "../components/course-management";
import { FavoriteCoursesSection } from "../components/favorite-courses-section";
import { toggleFavoriteCourse, useFavoriteCourseState } from "../components/favorites";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";

export default function FavouritesScreen() {
  const router = useRouter();
  const courseCatalog = useCourseCatalog();
  const { horizontalPadding, screenBottomPadding, scaleFont, scaleLineHeight } = useResponsiveLayout();
  const { ids: favoriteCourseIds, initialized, error } = useFavoriteCourseState();
  const [notice, setNotice] = useState<string | null>(null);
  const favoriteCourses = courseCatalog.courses.filter((course) => favoriteCourseIds.includes(course.id));

  const handleToggleFavorite = async (courseId: string) => {
    try {
      setNotice(null);
      await toggleFavoriteCourse(courseId);
    } catch (toggleError) {
      setNotice(toggleError instanceof Error ? toggleError.message : "Unable to update favourites right now.");
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: screenBottomPadding },
        ]}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>SAVED FOR NEXT ROUND</Text>
          <Text
            style={[
              styles.heroTitle,
              {
                fontSize: scaleFont(styles.heroTitle.fontSize),
                lineHeight: scaleLineHeight(styles.heroTitle.lineHeight),
              },
            ]}
          >
            Favourite courses at a glance.
          </Text>
          <Text style={styles.heroText}>
            Keep your go-to fairways together so the next booking takes only a few taps.
          </Text>
        </View>

        {!initialized ? <Text style={styles.statusText}>Loading your favourites...</Text> : null}
        {notice || error ? <Text style={styles.statusText}>{notice || error}</Text> : null}

        <FavoriteCoursesSection
          courses={favoriteCourses}
          subtitle="CURATED LIST"
          title="Your Favourites"
          cardActionLabel="Remove Favourite"
          cardActionIcon="heart-dislike-outline"
          onPressCourse={(courseId) => router.push({ pathname: "/course-details", params: { id: courseId } })}
          onPressCardAction={(courseId) => void handleToggleFavorite(courseId)}
        />
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 140,
    gap: 22,
  },
  heroCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  heroEyebrow: {
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: "700",
    color: theme.colors.accentWarm,
    letterSpacing: 2.2,
  },
  heroTitle: {
    fontSize: theme.typography.h1.fontSize,
    lineHeight: theme.typography.h1.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  heroText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textSoft,
    maxWidth: 360,
  },
  statusText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
});
