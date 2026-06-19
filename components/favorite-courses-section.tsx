import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { AnimatedPressable as Pressable } from "./animated-pressable";
import { CourseCard } from "./course-card";
import { CourseRecord } from "../services/course-data";
import { createThemedStyleSheet, useThemedStyles, useAppTheme } from "./theme";

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
  const { colors } = useAppTheme();
  const styles = useThemedStyles(themedStyles);

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
              <Ionicons name="arrow-forward" size={isSmall ? 13 : 14} color={colors.text} />
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
            <Ionicons name="heart-outline" size={18} color={colors.text} />
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

const themedStyles = createThemedStyleSheet((colors) => ({
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
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: colors.accentWarm,
    letterSpacing: 2.2,
    marginBottom: 2,
  },
  subtitleSmall: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.6,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
    fontWeight: "800",
  },
  titleSmall: {
    fontSize: 16,
    lineHeight: 22,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 11,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  viewAllButtonSmall: {
    paddingHorizontal: 10,
    minHeight: 36,
    paddingVertical: 6,
  },
  viewAllText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: colors.text,
  },
  viewAllTextSmall: {
    fontSize: 10,
    lineHeight: 13,
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
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyCardSmall: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  emptyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTextWrap: {
    flex: 1,
    gap: 2,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    fontWeight: "700",
  },
  emptyTitleSmall: {
    fontSize: 14,
    lineHeight: 21,
  },
  emptySubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSoft,
  },
}));
