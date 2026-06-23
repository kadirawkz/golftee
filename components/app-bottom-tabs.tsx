import { Ionicons } from "@expo/vector-icons";
import { useNavigation, usePathname, useRouter } from "expo-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { BackHandler, Platform, ScrollView, Text, View, useWindowDimensions, Image, TouchableWithoutFeedback } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "./animated-pressable";
import { AppHeader } from "./app-header";
import { AppImage } from "./app-image";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "./theme";
import { useNotificationState, markAsRead, markAllAsRead, deleteNotification } from "../services/notifications";
import { useAuthSession, signOut } from "../services/auth";

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
  const navigation = useNavigation();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, setThemeMode, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);

  const auth = useAuthSession();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const tabHistoryRef = useRef<TabRoute[]>(["/home"]);
  const shellBackgroundColor = theme.system.getBackground(pathname, colors);

  const isSecureNoChromeRoute = SECURE_NO_CHROME_ROUTES.includes(pathname);
  
  const isAuthOrSplash =
    pathname === "/" ||
    pathname === "/launch" ||
    pathname === "/splash" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password";

  const isTabletLike = width >= 768;

  const isMainPage =
    pathname === "/home" ||
    pathname === "/explore" ||
    pathname === "/bookings" ||
    pathname === "/favourites" ||
    pathname === "/profile";

  // Bottom navigation only displays on mobile for authenticated routes matching tabs, course details, or manage booking.
  const showBottomNav =
    !isTabletLike &&
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
  const navHorizontalInset = isCompact ? 12 : 16;
  const navHeight = isCompact ? 62 : 68;
  const navBottom = Math.max(insets.bottom + 6, 8);
  const iconSize = isCompact ? 18 : 22;
  const iconPillSize = isCompact ? 30 : 34;

  const labelStyle = [
    styles.navLabel,
    isCompact && styles.navLabelCompact,
  ];

  useEffect(() => {
    if (!tabItems.some((item) => item.route === pathname)) {
      return;
    }

    const history = tabHistoryRef.current;
    const lastRoute = history[history.length - 1];

    if (lastRoute !== pathname) {
      history.push(pathname as TabRoute);
      return;
    }

    if (history.length === 0) {
      history.push(pathname as TabRoute);
    }
  }, [pathname]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (navigation.canGoBack()) {
        router.back();
        return true;
      }

      if (tabItems.some((item) => item.route === pathname)) {
        const history = tabHistoryRef.current;
        if (history.length > 1) {
          history.pop();
          const previousTab = history[history.length - 1] ?? "/home";
          router.navigate(previousTab as TabRoute);
          return true;
        }

        BackHandler.exitApp();
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [navigation, pathname, router]);

  const handleHeaderBack = () => {
    if (pathname === "/login") {
      router.replace("/splash");
      return;
    }
    router.back();
  };

  const toggleTheme = () => {
    void setThemeMode(resolvedTheme === "dark" ? "light" : "system");
  };

  const sidebarItems: {
    label: string;
    route: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { label: "Home", route: "/home", icon: "home-outline" },
    { label: "Explore Courses", route: "/explore", icon: "search-outline" },
    { label: "My Bookings", route: "/bookings", icon: "calendar-outline" },
    { label: "Favourites", route: "/favourites", icon: "heart-outline" },
    { label: "Profile", route: "/profile", icon: "person-outline" },
  ];

  const mainView = (
    <View style={styles.mainContainer}>
      {/* Show AppHeader only on mobile/compact viewports */}
      {!isTabletLike && headerConfig.showHeader ? (
        <AppHeader
          title={headerConfig.title}
          titleSize={headerConfig.titleSize}
          leftIcon={headerConfig.leftIcon}
          onPressLeft={handleHeaderBack}
          showLeftButton={headerConfig.showLeftButton}
          rightIcon={headerConfig.rightIcon}
          onPressRight={() => router.navigate("/notifications" as never)}
          showRightButton={headerConfig.showRightButton}
        />
      ) : null}

      {/* Desktop header breadcrumb if not auth/splash and is nested page */}
      {isTabletLike && !isAuthOrSplash && headerConfig.showHeader && (
        <View style={styles.desktopHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            {!isMainPage && (
              <>
                {headerConfig.showLeftButton ? (
                  <Pressable style={styles.desktopBackBtn} onPress={handleHeaderBack} variant="icon">
                    <Ionicons name="arrow-back" size={20} color={colors.text} />
                  </Pressable>
                ) : null}
                <Text style={styles.desktopHeaderTitle}>
                  {headerConfig.title || "GolfTee"}
                </Text>
              </>
            )}
          </View>

          {/* Notifications Bell on Top Right */}
          <View style={{ zIndex: 300, position: "relative" }}>
            <Pressable
              style={styles.notifBellBtn}
              onPress={() => { setShowNotificationsPanel(!showNotificationsPanel); setShowAccountMenu(false); }}
              variant="icon"
            >
              <Ionicons
                name={unreadCount > 0 ? "notifications" : "notifications-outline"}
                size={20}
                color={colors.text}
              />
              {unreadCount > 0 && (
                <View style={styles.notifBellBadge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )}
            </Pressable>

            {/* Local Backdrop for notifications panel */}
            {showNotificationsPanel && (
              <TouchableWithoutFeedback onPress={() => setShowNotificationsPanel(false)}>
                <View style={{
                  position: (Platform.OS === "web" ? "fixed" : "absolute") as any,
                  top: Platform.OS === "web" ? 0 : -2000,
                  left: Platform.OS === "web" ? 0 : -2000,
                  right: Platform.OS === "web" ? 0 : -2000,
                  bottom: Platform.OS === "web" ? 0 : -2000,
                  backgroundColor: "transparent",
                  zIndex: 150,
                }} />
              </TouchableWithoutFeedback>
            )}

            {/* Notifications Panel Dropdown */}
            {showNotificationsPanel && (
              <View style={styles.notifPanel}>
                <View style={styles.notifPanelHeader}>
                  <Text style={styles.notifPanelTitle}>Notifications</Text>
                  {unreadCount > 0 && (
                    <Pressable
                      onPress={() => { void markAllAsRead(); }}
                      variant="button"
                      style={styles.markAllBtn}
                    >
                      <Text style={styles.markAllText}>Mark all read</Text>
                    </Pressable>
                  )}
                </View>
                <ScrollView style={styles.notifPanelList} showsVerticalScrollIndicator={Platform.OS === "web"}>
                  {notifications.length === 0 ? (
                    <View style={styles.notifEmptyState}>
                      <Ionicons name="notifications-off-outline" size={32} color={colors.muted} />
                      <Text style={styles.notifEmptyText}>No notifications yet</Text>
                    </View>
                  ) : (
                    notifications.slice(0, 20).map((notif) => (
                      <Pressable
                        key={notif.id}
                        style={[styles.notifItem, !notif.read && styles.notifItemUnread]}
                        onPress={() => {
                          void markAsRead(notif.id);
                          if (notif.route) {
                            setShowNotificationsPanel(false);
                            router.navigate(notif.route as any);
                          }
                        }}
                        variant="card"
                      >
                        <View style={[styles.notifIconWrap, { backgroundColor: colors.surfaceSoft }]}>
                          <Ionicons name={(notif.icon as any) || "notifications-outline"} size={16} color={colors.primary} />
                        </View>
                        <View style={styles.notifTextWrap}>
                          <Text style={styles.notifItemTitle} numberOfLines={1}>{notif.title}</Text>
                          <Text style={styles.notifItemMsg} numberOfLines={2}>{notif.message}</Text>
                        </View>
                        <View style={styles.notifRightWrap}>
                          {!notif.read && <View style={styles.unreadDot} />}
                          <Pressable
                            style={styles.notifDismissBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              void deleteNotification(notif.id);
                            }}
                            variant="icon"
                            hitSlop={6}
                          >
                            <Ionicons name="close-outline" size={14} color={colors.muted} />
                          </Pressable>
                        </View>
                      </Pressable>
                    ))
                  )}
                </ScrollView>
                <Pressable
                  style={styles.notifViewAllBtn}
                  onPress={() => { setShowNotificationsPanel(false); router.navigate("/notifications" as any); }}
                  variant="button"
                >
                  <Text style={styles.notifViewAllText}>View All Notifications</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.content}>
        {children}
      </View>

      {/* Bottom Nav Bar (Mobile Only) */}
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

      {!isTabletLike && (
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
      )}
    </View>
  );

  return (
    <View style={[styles.chromeShell, { backgroundColor: shellBackgroundColor }]}>
      {isTabletLike && !isAuthOrSplash ? (
        <View style={styles.layoutWrapper}>
          {/* Responsive Sidebar Navigation */}
          <View style={styles.sidebar}>
            {/* Branding Logo */}
            <View style={styles.sidebarBranding}>
              <Image source={require("../assets/images/icon.png")} style={styles.logoImage} />
              <Text style={styles.brandingText}>GolfTee</Text>
            </View>

            {/* Navigation Menu */}
            <View style={styles.sidebarMenu}>
              {sidebarItems.map((item) => {
                const active = pathname === item.route;
                const isNotifications = item.route === "/notifications";
                return (
                  <Pressable
                    key={item.route}
                    style={[styles.sidebarMenuItem, active && styles.sidebarMenuItemActive]}
                    variant="tab"
                    onPress={() => router.navigate(item.route as any)}
                  >
                    <Ionicons
                      name={active ? (item.icon.replace("-outline", "") as any) : item.icon}
                      size={20}
                      color={active ? colors.text : colors.textSoft}
                    />
                    <Text style={[styles.sidebarMenuLabel, active && styles.sidebarMenuLabelActive]}>
                      {item.label}
                    </Text>
                    {isNotifications && unreadCount > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {/* Footer Widget */}
            <View style={styles.sidebarFooter}>
              {/* Account Popup Menu */}
              {showAccountMenu && (
                <>
                  {/* Local Backdrop for account popup menu */}
                  <TouchableWithoutFeedback onPress={() => setShowAccountMenu(false)}>
                    <View style={{
                      position: (Platform.OS === "web" ? "fixed" : "absolute") as any,
                      top: Platform.OS === "web" ? 0 : -2000,
                      left: Platform.OS === "web" ? 0 : -2000,
                      right: Platform.OS === "web" ? 0 : -2000,
                      bottom: Platform.OS === "web" ? 0 : -2000,
                      backgroundColor: "transparent",
                      zIndex: 90,
                    }} />
                  </TouchableWithoutFeedback>
                  <View style={[styles.accountPopupMenu, { zIndex: 100 }]}>
                  <Pressable
                    style={styles.popupMenuItem}
                    onPress={() => {
                      setShowAccountMenu(false);
                      router.navigate("/account");
                    }}
                    variant="card"
                  >
                    <Ionicons name="card-outline" size={16} color={colors.textSoft} />
                    <Text style={styles.popupMenuText}>Account & Membership</Text>
                  </Pressable>

                  <Pressable
                    style={styles.popupMenuItem}
                    onPress={() => {
                      setShowAccountMenu(false);
                      router.navigate("/settings");
                    }}
                    variant="card"
                  >
                    <Ionicons name="settings-outline" size={16} color={colors.textSoft} />
                    <Text style={styles.popupMenuText}>Settings</Text>
                  </Pressable>

                  <View style={styles.popupMenuDivider} />

                  <Pressable
                    style={styles.popupMenuItem}
                    onPress={() => {
                      setShowAccountMenu(false);
                      void signOut();
                    }}
                    variant="card"
                  >
                    <Ionicons name="log-out-outline" size={16} color={colors.danger} />
                    <Text style={[styles.popupMenuText, { color: colors.danger }]}>Log Out</Text>
                  </Pressable>
                </View>
              </>
            )}

              {/* Theme Selector Toggle */}
              <Pressable
                style={styles.themeToggleBtn}
                onPress={toggleTheme}
                variant="button"
              >
                <Ionicons
                  name={resolvedTheme === "dark" ? "sunny-outline" : "moon-outline"}
                  size={18}
                  color={colors.textSoft}
                />
                <Text style={styles.themeToggleText}>
                  {resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
                </Text>
              </Pressable>

              {/* User Bio Card */}
              {auth.isAuthenticated && auth.profile ? (
                <Pressable
                  style={styles.userCard}
                  onPress={() => setShowAccountMenu(!showAccountMenu)}
                  variant="card"
                >
                  <View style={styles.avatar}>
                    {auth.profile.avatar_url ? (
                      <AppImage source={{ uri: auth.profile.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>
                        {(auth.profile.full_name || auth.profile.username || "G")[0].toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {auth.profile.full_name || auth.profile.username}
                    </Text>
                    <Text style={styles.userTier} numberOfLines={1}>
                      {((auth.profile as any)?.membership_tiers?.name as string)?.toUpperCase() ?? "STANDARD"}
                    </Text>
                  </View>
                  <Ionicons name="ellipsis-vertical" size={14} color={colors.textSoft} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Main Layout Area */}
          <View style={styles.mainContainerWrapper}>
            {mainView}
          </View>
        </View>
      ) : (
        mainView
      )}
    </View>
  );
}

const themedStyles = createThemedStyleSheet((colors) => ({
  chromeShell: {
    flex: 1,
    backgroundColor: colors.page,
  },
  layoutWrapper: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 250,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  sidebarBranding: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  brandingText: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  sidebarMenu: {
    flex: 1,
    gap: 6,
  },
  sidebarMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    minHeight: 44,
  },
  sidebarMenuItemActive: {
    backgroundColor: colors.surfaceSoft,
  },
  sidebarMenuLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSoft,
    flex: 1,
  },
  sidebarMenuLabelActive: {
    fontWeight: "700",
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sidebarFooter: {
    gap: 16,
    borderTopWidth: 1,
    borderColor: colors.borderSoft,
    paddingTop: 16,
  },
  themeToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  themeToggleText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSoft,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.page,
    fontWeight: "700",
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  userTier: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.accentWarm,
    letterSpacing: 0.5,
  },
  mainContainerWrapper: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  desktopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    position: "relative",
    zIndex: 10,
  },
  desktopBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
  },
  desktopHeaderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
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
  navLabelActive: {
    color: colors.text,
    fontWeight: "700",
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
    resizeMode: "contain",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  accountPopupMenu: {
    position: "absolute",
    bottom: 64,
    left: 8,
    right: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 100,
  },
  popupMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    minHeight: 36,
  },
  popupMenuText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text,
  },
  popupMenuDivider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginVertical: 4,
  },
  notifBellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
  },
  notifBellBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: colors.accent,
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  notifPanel: {
    position: "absolute",
    top: 44,
    right: 0,
    width: 320,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    zIndex: 200,
    overflow: "hidden",
  },
  notifPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.borderSoft,
  },
  notifPanelTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surfaceSoft,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
  },
  notifPanelList: {
    maxHeight: 340,
  },
  notifEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  notifEmptyText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "500",
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.borderSoft,
  },
  notifItemUnread: {
    backgroundColor: colors.surfaceSoft,
  },
  notifIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  notifTextWrap: {
    flex: 1,
    gap: 2,
  },
  notifItemTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  notifItemMsg: {
    fontSize: 11,
    fontWeight: "400",
    color: colors.textSoft,
    lineHeight: 15,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  notifRightWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
  },
  notifDismissBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notifViewAllBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: colors.borderSoft,
  },
  notifViewAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
}));

