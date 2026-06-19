import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { type ReactNode, useEffect } from "react";
import { BackHandler, Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "./animated-pressable";
import { AppHeader } from "./app-header";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "./theme";
import { useNotificationState } from "../services/notifications";

type TabRoute = "/home" | "/explore" | "/bookings" | "/profile";

const tabItems: {
  label: string;
  route: TabRoute;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: "HOME", route: "/home", icon: "home" },
  { label: "EXPLORE", route: "/explore", icon: "search" },
  { label: "BOOKINGS", route: "/bookings", icon: "calendar" },
  { label: "PROFILE", route: "/profile", icon: "person" },
];

type AppBottomTabsProps = {
  children: ReactNode;
};

type HeaderRoute =
  | "/"
  | "/launch"
  | "/home"
  | "/explore"
  | "/bookings"
  | "/manage-booking"
  | "/booking-history"
  | "/profile"
  | "/favourites"
  | "/account"
  | "/settings"
  | "/payment-methods"
  | "/notifications"
  | "/login"
  | "/signup"
  | "/forgot-password"
  | "/course-details"
  | "/tee-time-booking"
  | "/booking-checkout"
  | "/splash";

type HeaderConfig = {
  title: string;
  titleSize: "regular" | "large";
  showHeader: boolean;
  showLeftButton: boolean;
  showRightButton: boolean;
  leftIcon: keyof typeof Ionicons.glyphMap;
  rightIcon: keyof typeof Ionicons.glyphMap;
};

const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  title: "GolfTee",
  titleSize: "regular",
  showHeader: true,
  showLeftButton: true,
  showRightButton: true,
  leftIcon: "arrow-back",
  rightIcon: "notifications",
};

const HEADER_CONFIG_BY_ROUTE: Partial<Record<HeaderRoute, Partial<HeaderConfig>>> = {
  "/": { showHeader: false, showRightButton: false, showLeftButton: false },
  "/launch": { showHeader: false, showRightButton: false, showLeftButton: false },
  "/home": { title: "GolfTee", titleSize: "large", showLeftButton: false },
  "/explore": { title: "Explore", showLeftButton: false },
  "/bookings": { title: "Bookings", showLeftButton: false },
  "/manage-booking": { title: "Manage Booking", showRightButton: true },
  "/booking-history": { title: "Booking History", showRightButton: false, showLeftButton: true },
  "/profile": { title: "Profile", showLeftButton: false },
  "/favourites": { title: "Favourites", showRightButton: false, showLeftButton: true },
  "/account": { title: "Account", showRightButton: false, showLeftButton: true },
  "/settings": { title: "Settings", showRightButton: false, showLeftButton: true },
  "/payment-methods": { title: "Payment Methods", showRightButton: false, showLeftButton: true },
  "/notifications": { title: "Notifications", showRightButton: false },
  "/login": { showHeader: false, showRightButton: false, showLeftButton: false },
  "/signup": { showHeader: false, showRightButton: false, showLeftButton: false },
  "/forgot-password": { showHeader: false, showRightButton: false, showLeftButton: false },
  "/course-details": { title: "Course Details" },
  "/tee-time-booking": { title: "Book Tee Time", showHeader: true, showRightButton: false, showLeftButton: true },
  "/booking-checkout": {
    title: "",
    showHeader: true,
    showRightButton: false,
    showLeftButton: true,
  },
  "/splash": { showHeader: false, showRightButton: false, showLeftButton: false },
};

const SECURE_NO_CHROME_ROUTES: readonly string[] = ["/tee-time-booking", "/booking-checkout"];

export function AppBottomTabs({ children }: AppBottomTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(themedStyles);

  const shellBackgroundColor = theme.system.getBackground(pathname, colors);

  const isSecureNoChromeRoute = SECURE_NO_CHROME_ROUTES.includes(pathname);
  const showBottomNav =
    !isSecureNoChromeRoute &&
    (tabItems.some((item) => item.route === pathname) || pathname === "/course-details" || pathname === "/manage-booking");
  const routeHeaderConfig = HEADER_CONFIG_BY_ROUTE[pathname as HeaderRoute] ?? {};

  const { notifications } = useNotificationState();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUnreadNotifications = unreadCount > 0;

  const headerConfig: HeaderConfig = {
    ...DEFAULT_HEADER_CONFIG,
    rightIcon: hasUnreadNotifications ? "notifications" : "notifications-outline",
    ...routeHeaderConfig,
  };
  const isCompact = width < 360;
  const isTabletLike = width >= 768;
  const navHorizontalInset = isTabletLike ? Math.max((width - 480) / 2, 28) : isCompact ? 12 : 16;
  const navHeight = isTabletLike ? 74 : isCompact ? 62 : 68;
  const navBottom = Math.max(insets.bottom + 6, 8);
  const iconSize = isTabletLike ? 24 : isCompact ? 18 : 22;
  const iconPillSize = isTabletLike ? 40 : isCompact ? 30 : 34;
  const labelStyle = [
    styles.navLabel,
    isCompact && styles.navLabelCompact,
    isTabletLike && styles.navLabelTablet,
  ];

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (tabItems.some((item) => item.route === pathname)) {
        if (pathname !== "/home") {
          router.replace("/home");
          return true;
        }
        BackHandler.exitApp();
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [pathname]);

  const handleHeaderBack = () => {
    if (pathname === "/login") {
      router.replace("/splash");
      return;
    }
    router.back();
  };

  return (
    <View style={[styles.chromeShell, { backgroundColor: shellBackgroundColor }]}>
      {headerConfig.showHeader ? (
        <AppHeader
          title={headerConfig.title}
          titleSize={headerConfig.titleSize}
          leftIcon={headerConfig.leftIcon}
          onPressLeft={handleHeaderBack}
          showLeftButton={headerConfig.showLeftButton}
          rightIcon={headerConfig.rightIcon}
          onPressRight={() => router.push("/notifications" as never)}
          showRightButton={headerConfig.showRightButton}
        />
      ) : null}

      <View style={styles.content}>
        {children}
      </View>

      {showBottomNav ? (
        <View
          style={[
            styles.bottomNav,
            {
              left: navHorizontalInset,
              right: navHorizontalInset,
              bottom: navBottom,
              height: navHeight,
            },
          ]}
        >
          {tabItems.map((item) => {
            const active = pathname === item.route;

            return (
              <Pressable
                key={item.route}
                style={[styles.navItem, isCompact && styles.navItemCompact]}
                variant="tab"
                onPress={() => {
                  if (!active) {
                    router.navigate(item.route);
                  }
                }}
              >
                <View
                  style={[
                    styles.iconPill,
                    {
                      width: iconPillSize,
                      height: iconPillSize,
                    },
                    active && styles.iconPillActive,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={iconSize}
                    color={active ? colors.text : colors.muted}
                  />
                </View>
                <Text style={[labelStyle, active && styles.navLabelActive]} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View
        pointerEvents="none"
        style={[
          styles.bottomSystemInset,
          {
            height: insets.bottom,
            backgroundColor: shellBackgroundColor,
          },
        ]}
      />
    </View>
  );
}

const themedStyles = createThemedStyleSheet((colors) => ({
  chromeShell: {
    flex: 1,
    backgroundColor: colors.page,
  },
  content: {
    flex: 1,
  },
  bottomSystemInset: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomNav: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 8,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    opacity: 0.95,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minHeight: 48,
  },
  navItemCompact: {
    gap: 2,
    paddingHorizontal: 2,
  },
  iconPill: {
    width: 27,
    height: 27,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
  },
  iconPillActive: {
    backgroundColor: colors.surfaceMuted,
  },
  navLabel: {
    fontSize: 10,
    lineHeight: 13,
    color: colors.muted,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  navLabelCompact: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1.8,
  },
  navLabelTablet: {
    fontSize: 10,
    lineHeight: 13,
  },
  navLabelActive: {
    color: colors.text,
    fontWeight: "700",
  },
}));
