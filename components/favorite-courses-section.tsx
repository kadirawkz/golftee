import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { AnimatedPressable as Pressable } from "./animated-pressable";
import { CourseCard } from "./course-card";
import { CourseRecord } from "./course-data";
import { theme } from "./theme";

type FavoriteCoursesSectionProps = {
  title?: string;
  subtitle?: string;
  courses: CourseRecord[];
  size?: "regular" | "small";
  showHeader?: boolean;
  showEmptyState?: boolean;
  cardActionLabel?: string;
  cardActionIcon?: keyof typeof Ionicons.glyphMap;
  onPressCourse: (courseId: string) => void;
  onPressCardAction?: (courseId: string) => void;
  onPressViewAll?: () => void;
};

export function FavoriteCoursesSection({
  title = "Favourite Courses",
  subtitle = "YOUR PICKS",
  courses,
  size = "regular",
  showHeader = true,
  showEmptyState = true,
  cardActionLabel,
  cardActionIcon,
  onPressCourse,
  onPressCardAction,
  onPressViewAll,
}: FavoriteCoursesSectionProps) {
  const isSmall = size === "small";

  return (
    <View style={[styles.section, isSmall && styles.sectionSmall]}>
      {showHeader ? (
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={[styles.subtitle, isSmall && styles.subtitleSmall]}>{subtitle}</Text>
            <Text style={[styles.title, isSmall && styles.titleSmall]}>{title}</Text>
          </View>

          {onPressViewAll ? (
            <Pressable style={[styles.viewAllButton, isSmall && styles.viewAllButtonSmall]} onPress={onPressViewAll} variant="chip">
              <Text style={[styles.viewAllText, isSmall && styles.viewAllTextSmall]}>View All</Text>
              <Ionicons name="arrow-forward" size={isSmall ? 13 : 14} color={theme.colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {courses.length ? (
        <View style={styles.list}>
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              variant="compact"
              size={isSmall ? "small" : "regular"}
              title={course.title}
              location={course.location}
              image={course.image}
              price={course.price}
              rating={course.rating}
              styleLabel={course.style}
              tone={course.style === "COASTAL" ? "green" : "gold"}
              compactActionLabel={cardActionLabel}
              compactActionIcon={cardActionIcon}
              onPressCompactAction={onPressCardAction ? () => onPressCardAction(course.id) : undefined}
              onPress={() => onPressCourse(course.id)}
            />
          ))}
        </View>
      ) : showEmptyState ? (
        <View style={[styles.emptyCard, isSmall && styles.emptyCardSmall]}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="heart-outline" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.emptyTextWrap}>
            <Text style={[styles.emptyTitle, isSmall && styles.emptyTitleSmall]}>No favourites yet</Text>
            <Text style={styles.emptySubtitle}>Save a course from its detail page and it will appear here.</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  sectionSmall: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  titleWrap: {
    flex: 1,
  },
  subtitle: {
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: "700",
    color: theme.colors.accentWarm,
    letterSpacing: 2.2,
    marginBottom: 2,
  },
  subtitleSmall: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    letterSpacing: 1.6,
  },
  title: {
    fontSize: theme.typography.h4.fontSize,
    lineHeight: theme.typography.h4.lineHeight,
    color: theme.colors.text,
    fontWeight: "800",
  },
  titleSmall: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 11,
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  viewAllButtonSmall: {
    paddingHorizontal: 10,
    minHeight: 36,
    paddingVertical: 6,
  },
  viewAllText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  viewAllTextSmall: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
  },
  list: {
    gap: 12,
  },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  emptyCardSmall: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  emptyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTextWrap: {
    flex: 1,
    gap: 2,
  },
  emptyTitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  emptyTitleSmall: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  emptySubtitle: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
  },
});
