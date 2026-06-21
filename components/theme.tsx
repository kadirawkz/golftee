import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useDeviceColorScheme, StyleSheet, ViewStyle, TextStyle, ImageStyle, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  | "signup"
  | "forgot-password";

type ScreenTransitionPreset = "shared" | "boot" | "splash" | "auth" | "root" | "detail" | "taskFlow";

export interface ThemeColors {
  background: string;
  page: string;
  surface: string;
  surfaceSoft: string;
  surfaceMuted: string;
  surfaceTint: string;
  text: string;
  textSoft: string;
  muted: string;
  textOnPrimary: string;
  textOnPrimarySoft: string;
  textOnPrimaryMuted: string;
  textOnPrimaryDim: string;
  textOnPrimaryStrong: string;
  border: string;
  borderStrong: string;
  borderSoft: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  accentWarm: string;
  success: string;
  successText: string;
  danger: string;
  dangerSoft: string;
  successStrong: string;
  warning: string;
  overlay: string;
  overlayStrong: string;
  overlaySoft: string;
  overlayHero: string;
  overlayDark: string;
  glass: string;
  glassBorder: string;
  heroGlow: string;
  inverse: string;
  shadow: string;
}

// Dark Theme colors: Strict White Font on Dark/Forest-Green Background
const darkColors: ThemeColors = {
  background: "#000000",
  page: "#000000",
  surface: "#121212",
  surfaceSoft: "#1E1E1E",
  surfaceMuted: "#282828",
  surfaceTint: "#333333",
  text: "#FFFFFF",
  textSoft: "rgba(255, 255, 255, 0.78)",
  muted: "rgba(255, 255, 255, 0.52)",
  textOnPrimary: "#000000",
  textOnPrimarySoft: "rgba(0, 0, 0, 0.84)",
  textOnPrimaryMuted: "rgba(0, 0, 0, 0.70)",
  textOnPrimaryDim: "rgba(0, 0, 0, 0.55)",
  textOnPrimaryStrong: "rgba(0, 0, 0, 0.95)",
  border: "rgba(255, 255, 255, 0.12)",
  borderStrong: "rgba(255, 255, 255, 0.20)",
  borderSoft: "rgba(255, 255, 255, 0.08)",
  primary: "#FFFFFF",
  primarySoft: "#121212",
  accent: "#C79A4B",
  accentSoft: "#222222",
  accentWarm: "#D8AB5C",
  success: "#181818",
  successText: "#4ADE80",
  danger: "#F87171",
  dangerSoft: "#2D1E1E",
  successStrong: "#4ADE80",
  warning: "#FBBF24",
  overlay: "rgba(0, 0, 0, 0.40)",
  overlayStrong: "rgba(0, 0, 0, 0.60)",
  overlaySoft: "rgba(0, 0, 0, 0.20)",
  overlayHero: "rgba(0, 0, 0, 0.35)",
  overlayDark: "rgba(0, 0, 0, 0.55)",
  glass: "rgba(18, 18, 18, 0.85)",
  glassBorder: "rgba(255, 255, 255, 0.10)",
  heroGlow: "rgba(255, 255, 255, 0.05)",
  inverse: "#FFFFFF",
  shadow: "#000000",
};

// Light Theme colors: Strict Black Font on Light/White Background
const lightColors: ThemeColors = {
  background: "#FFFFFF",
  page: "#FFFFFF",
  surface: "#F7F9F8",
  surfaceSoft: "#EEF2F0",
  surfaceMuted: "#E4EAE6",
  surfaceTint: "#DAE2DE",
  text: "#000000",
  textSoft: "#374151",
  muted: "#6B7280",
  textOnPrimary: "#FFFFFF",
  textOnPrimarySoft: "rgba(255, 255, 255, 0.84)",
  textOnPrimaryMuted: "rgba(255, 255, 255, 0.70)",
  textOnPrimaryDim: "rgba(255, 255, 255, 0.55)",
  textOnPrimaryStrong: "rgba(255, 255, 255, 0.95)",
  border: "rgba(0, 0, 0, 0.10)",
  borderStrong: "rgba(0, 0, 0, 0.18)",
  borderSoft: "rgba(0, 0, 0, 0.06)",
  primary: "#111827",
  primarySoft: "#F3F4F6",
  accent: "#C79A4B",
  accentSoft: "#FEF3C7",
  accentWarm: "#B45309",
  success: "#DEF7EC",
  successText: "#03543F",
  danger: "#9B1C1C",
  dangerSoft: "#FDE8E8",
  successStrong: "#057A55",
  warning: "#9F580A",
  overlay: "rgba(17, 24, 39, 0.40)",
  overlayStrong: "rgba(17, 24, 39, 0.60)",
  overlaySoft: "rgba(17, 24, 39, 0.20)",
  overlayHero: "rgba(17, 24, 39, 0.30)",
  overlayDark: "rgba(0, 0, 0, 0.50)",
  glass: "rgba(255, 255, 255, 0.90)",
  glassBorder: "rgba(0, 0, 0, 0.08)",
  heroGlow: "rgba(199, 154, 75, 0.10)",
  inverse: "#000000",
  shadow: "#9CA3AF",
};

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
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  strong: {
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
} as const;

const pressable: Record<PressableMotionVariant, PressableMotionConfig> = {
  button: { scale: 0.986, translateY: 0.6, opacity: 0.995, stiffness: 720, damping: 42, mass: 0.22 },
  cta: { scale: 0.982, translateY: 0.9, opacity: 0.992, stiffness: 760, damping: 44, mass: 0.22 },
  chip: { scale: 0.976, translateY: 0.4, opacity: 0.996, stiffness: 780, damping: 46, mass: 0.2 },
  card: { scale: 0.992, translateY: 0.9, opacity: 0.996, stiffness: 640, damping: 40, mass: 0.24 },
  icon: { scale: 0.95, translateY: 0.3, opacity: 0.994, stiffness: 820, damping: 48, mass: 0.2 },
  tab: { scale: 0.97, translateY: 0.5, opacity: 0.995, stiffness: 760, damping: 44, mass: 0.2 },
};

const sharedScreenTransition = (colors: ThemeColors): NativeStackNavigationOptions => ({
  headerShown: false,
  presentation: "card",
  statusBarAnimation: "fade",
  contentStyle: { backgroundColor: colors.page },
});

const getScreenTransitions = (colors: ThemeColors): Record<ScreenTransitionPreset, NativeStackNavigationOptions> => {
  const shared = sharedScreenTransition(colors);
  return {
    shared,
    boot: {
      ...shared,
      animation: "none",
      animationTypeForReplace: "pop",
      animationDuration: 0,
      gestureEnabled: false,
      fullScreenGestureEnabled: false,
    },
    splash: {
      ...shared,
      animation: "fade",
      animationTypeForReplace: "pop",
      animationDuration: 120,
      gestureEnabled: false,
      fullScreenGestureEnabled: false,
    },
    auth: {
      ...shared,
      animation: "fade_from_bottom",
      animationTypeForReplace: "push",
      animationDuration: 140,
      gestureEnabled: false,
      fullScreenGestureEnabled: false,
    },
    root: {
      ...shared,
      animation: "fade",
      animationTypeForReplace: "push",
      animationDuration: 110,
      gestureEnabled: false,
      fullScreenGestureEnabled: false,
    },
    detail: {
      ...shared,
      animation: "slide_from_right",
      animationTypeForReplace: "push",
      animationDuration: 160,
      gestureEnabled: true,
      fullScreenGestureEnabled: true,
    },
    taskFlow: {
      ...shared,
      animation: "slide_from_bottom",
      animationTypeForReplace: "push",
      animationDuration: 180,
      gestureEnabled: true,
      gestureDirection: "vertical",
      fullScreenGestureEnabled: true,
      animationMatchesGesture: true,
    },
  };
};

const routeTransitionPresets: Record<AppRouteName, ScreenTransitionPreset> = {
  index: "boot",
  launch: "boot",
  splash: "splash",
  login: "auth",
  signup: "auth",
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
  "tee-time-booking": "taskFlow",
  "booking-checkout": "taskFlow",
  notifications: "detail",
};

const getSystemRouteBackground = (pathname: string | null | undefined, colors: ThemeColors): string => {
  return colors.page;
};

// --- Theme Context & State ---
export type ThemeMode = "system" | "light" | "dark";

export interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: "light" | "dark";
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  themeInitialized: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [themeInitialized, setThemeInitialized] = useState(false);
  const deviceColorScheme = useDeviceColorScheme();
  const [webColorScheme, setWebColorScheme] = useState<"light" | "dark">(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem("golftee:theme_mode");
        if (saved === "light" || saved === "dark" || saved === "system") {
          setThemeModeState(saved);
        }
      } catch (err) {
        console.warn("Failed to load theme preference", err);
      } finally {
        setThemeInitialized(true);
      }
    };
    void loadTheme();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        setWebColorScheme(e.matches ? "dark" : "light");
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem("golftee:theme_mode", mode);
    } catch (err) {
      console.warn("Failed to save theme preference", err);
    }
  };

  const resolvedTheme =
    themeMode === "system"
      ? Platform.OS === "web"
        ? webColorScheme
        : (deviceColorScheme ?? "light")
      : themeMode;
  const colors = resolvedTheme === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, colors, setThemeMode, themeInitialized }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return context;
}

// --- Dynamic Stylesheet Helpers ---
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function createThemedStyleSheet<T extends NamedStyles<T> | NamedStyles<any>>(
  factory: (colors: ThemeColors) => T
): (colors: ThemeColors) => T {
  return factory;
}

export function useThemedStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  factory: (colors: ThemeColors) => T
): T {
  const { colors } = useAppTheme();
  return StyleSheet.create(factory(colors)) as unknown as T;
}

// Statically exported theme configuration for fallback/outside-react context
export const theme = {
  colors: darkColors, // Default fallback
  radius,
  spacing,
  typography,
  shadow,
  motion: {
    pressable,
    getScreenOptions: (routeName: string, colors: ThemeColors = darkColors): NativeStackNavigationOptions => {
      const preset = routeTransitionPresets[routeName as AppRouteName];
      const transitions = getScreenTransitions(colors);
      return preset ? transitions[preset] : transitions.shared;
    },
  },
  system: {
    getBackground: getSystemRouteBackground,
  },
} as const;
