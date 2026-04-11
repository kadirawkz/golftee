import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

export type PressableMotionVariant = "button" | "cta" | "chip" | "card" | "icon" | "tab";

type PressableMotionConfig = {
  scale: number;
  translateY: number;
  opacity: number;
  stiffness: number;
  damping: number;
  mass: number;
};

type AppRouteName =
  | "index"
  | "launch"
  | "home"
  | "explore"
  | "bookings"
  | "profile"
  | "favourites"
  | "account"
  | "settings"
  | "booking-history"
  | "course-details"
  | "manage-booking"
  | "tee-time-booking"
  | "booking-checkout"
  | "notifications"
  | "splash"
  | "login"
  | "forgot-password";

type ScreenTransitionPreset = "shared" | "boot" | "splash" | "auth" | "root" | "detail" | "taskFlow";

type AppPathname =
  | "/"
  | "/launch"
  | "/home"
  | "/explore"
  | "/bookings"
  | "/profile"
  | "/favourites"
  | "/account"
  | "/settings"
  | "/booking-history"
  | "/course-details"
  | "/manage-booking"
  | "/tee-time-booking"
  | "/booking-checkout"
  | "/notifications"
  | "/splash"
  | "/login"
  | "/forgot-password";

const colors = {
  background: "#ffffff",
  page: "#ffffff",
  surface: "#ffffff",
  surfaceSoft: "#ffffff",
  surfaceMuted: "#ffffff",
  surfaceTint: "#ffffff",
  text: "#102B22",
  textSoft: "#5F6A63",
  muted: "#7E8781",
  textOnPrimary: "#ffffff",
  textOnPrimarySoft: "rgba(241, 244, 240, 0.84)",
  textOnPrimaryMuted: "rgba(255,255,255,0.72)",
  textOnPrimaryDim: "rgba(255,255,255,0.55)",
  textOnPrimaryStrong: "rgba(255,255,255,0.9)",
  border: "rgba(16, 43, 34, 0.10)",
  borderStrong: "rgba(16, 43, 34, 0.16)",
  borderSoft: "rgba(16, 43, 34, 0.08)",
  primary: "#12392D",
  primarySoft: "#EDF4F0",
  accent: "#C79A4B",
  accentSoft: "#F3E5C3",
  accentWarm: "#8C6A23",
  success: "#BDE7D3",
  successText: "#0F4B33",
  danger: "#B42318",
  dangerSoft: "#FFF2F1",
  successStrong: "#22C55E",
  warning: "#FF6B35",
  overlay: "rgba(16, 43, 34, 0.30)",
  overlayStrong: "rgba(7, 32, 24, 0.42)",
  overlaySoft: "rgba(16, 43, 34, 0.18)",
  overlayHero: "rgba(16, 43, 34, 0.38)",
  overlayDark: "rgba(0,0,0,0.35)",
  glass: "rgba(255,255,255,0.9)",
  glassBorder: "rgba(255,255,255,0.75)",
  heroGlow: "rgba(199, 154, 75, 0.24)",
  inverse: "#131616",
  shadow: "#102B22",
} as const;

const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

const typography = {
  displayXL: { fontSize: 56, lineHeight: 60, letterSpacing: -1.6, fontWeight: "900" },
  displayL: { fontSize: 44, lineHeight: 48, letterSpacing: -1.2, fontWeight: "900" },
  displayM: { fontSize: 38, lineHeight: 42, letterSpacing: -0.9, fontWeight: "900" },
  displayS: { fontSize: 32, lineHeight: 36, letterSpacing: -0.6, fontWeight: "800" },
  h1: { fontSize: 30, lineHeight: 36, letterSpacing: -0.5, fontWeight: "800" },
  h2: { fontSize: 24, lineHeight: 30, letterSpacing: -0.3, fontWeight: "800" },
  h3: { fontSize: 20, lineHeight: 26, letterSpacing: -0.15, fontWeight: "700" },
  h4: { fontSize: 18, lineHeight: 24, letterSpacing: -0.05, fontWeight: "700" },
  title: { fontSize: 16, lineHeight: 22, letterSpacing: 0, fontWeight: "700" },
  subtitle: { fontSize: 15, lineHeight: 22, letterSpacing: 0, fontWeight: "500" },
  body: { fontSize: 14, lineHeight: 21, letterSpacing: 0, fontWeight: "400" },
  bodyMd: { fontSize: 13, lineHeight: 19, letterSpacing: 0, fontWeight: "400" },
  bodySm: { fontSize: 12, lineHeight: 17, letterSpacing: 0.1, fontWeight: "400" },
  label: { fontSize: 11, lineHeight: 14, letterSpacing: 1.3, fontWeight: "700" },
  caption: { fontSize: 10, lineHeight: 13, letterSpacing: 0.4, fontWeight: "600" },
  overline: { fontSize: 9, lineHeight: 12, letterSpacing: 1.8, fontWeight: "800" },
} as const;

const shadow = {
  card: {
    shadowColor: "#102B22",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  strong: {
    shadowColor: "#102B22",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
} as const;

const pressable: Record<PressableMotionVariant, PressableMotionConfig> = {
  button: {
    scale: 0.986,
    translateY: 0.6,
    opacity: 0.995,
    stiffness: 720,
    damping: 42,
    mass: 0.22,
  },
  cta: {
    scale: 0.982,
    translateY: 0.9,
    opacity: 0.992,
    stiffness: 760,
    damping: 44,
    mass: 0.22,
  },
  chip: {
    scale: 0.976,
    translateY: 0.4,
    opacity: 0.996,
    stiffness: 780,
    damping: 46,
    mass: 0.2,
  },
  card: {
    scale: 0.992,
    translateY: 0.9,
    opacity: 0.996,
    stiffness: 640,
    damping: 40,
    mass: 0.24,
  },
  icon: {
    scale: 0.95,
    translateY: 0.3,
    opacity: 0.994,
    stiffness: 820,
    damping: 48,
    mass: 0.2,
  },
  tab: {
    scale: 0.97,
    translateY: 0.5,
    opacity: 0.995,
    stiffness: 760,
    damping: 44,
    mass: 0.2,
  },
};

const sharedScreenTransition: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: "card",
  statusBarAnimation: "fade",
  contentStyle: { backgroundColor: colors.page },
};

const screenTransitions: Record<ScreenTransitionPreset, NativeStackNavigationOptions> = {
  shared: sharedScreenTransition,
  boot: {
    ...sharedScreenTransition,
    animation: "none",
    animationTypeForReplace: "pop",
    animationDuration: 0,
    gestureEnabled: false,
    fullScreenGestureEnabled: false,
  },
  splash: {
    ...sharedScreenTransition,
    animation: "fade",
    animationTypeForReplace: "pop",
    animationDuration: 120,
    gestureEnabled: false,
    fullScreenGestureEnabled: false,
  },
  auth: {
    ...sharedScreenTransition,
    animation: "fade_from_bottom",
    animationTypeForReplace: "push",
    animationDuration: 140,
    gestureEnabled: false,
    fullScreenGestureEnabled: false,
  },
  root: {
    ...sharedScreenTransition,
    animation: "fade",
    animationTypeForReplace: "push",
    animationDuration: 110,
    gestureEnabled: false,
    fullScreenGestureEnabled: false,
  },
  detail: {
    ...sharedScreenTransition,
    animation: "slide_from_right",
    animationTypeForReplace: "push",
    animationDuration: 160,
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
  },
  taskFlow: {
    ...sharedScreenTransition,
    animation: "slide_from_bottom",
    animationTypeForReplace: "push",
    animationDuration: 180,
    gestureEnabled: true,
    gestureDirection: "vertical",
    fullScreenGestureEnabled: true,
    animationMatchesGesture: true,
  },
};

const routeTransitionPresets: Record<AppRouteName, ScreenTransitionPreset> = {
  index: "boot",
  launch: "boot",
  splash: "splash",
  login: "auth",
  "forgot-password": "auth",
  home: "root",
  explore: "root",
  bookings: "root",
  profile: "root",
  favourites: "detail",
  account: "detail",
  settings: "detail",
  "booking-history": "detail",
  "course-details": "detail",
  "manage-booking": "detail",
  notifications: "detail",
  "tee-time-booking": "taskFlow",
  "booking-checkout": "taskFlow",
};

const systemRouteBackgrounds: Partial<Record<AppPathname, string>> = {
  "/": colors.primary,
  "/launch": colors.primary,
  "/splash": colors.primary,
};

function getScreenOptions(routeName: string): NativeStackNavigationOptions {
  const preset = routeTransitionPresets[routeName as AppRouteName];
  return preset ? screenTransitions[preset] : screenTransitions.shared;
}

function getSystemBackground(pathname?: string | null): string {
  if (!pathname) {
    return colors.page;
  }

  return systemRouteBackgrounds[pathname as AppPathname] ?? colors.page;
}

export const theme = {
  colors: {
    ...colors,
  },
  radius: {
    ...radius,
  },
  spacing: {
    ...spacing,
  },
  typography: {
    ...typography,
  },
  shadow: {
    ...shadow,
  },
  motion: {
    pressable,
    screenTransitions,
    getScreenOptions,
  },
  system: {
    getBackground: getSystemBackground,
  },
} as const;
