import "../utils/ignore-warnings";
import { Stack, usePathname, useRouter } from "expo-router";
import * as NavigationBar from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppBottomTabs } from "../components/app-bottom-tabs";
import { ensureAuthReady, useAuthSession } from "../services/auth";
import { refreshCourseCatalog } from "../services/course-management";
import { theme, ThemeProvider, useAppTheme } from "../components/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}

function RootLayoutContent() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuthSession();
  const { colors, resolvedTheme, themeInitialized } = useAppTheme();
  const [isReady, setIsReady] = useState(false);
  const routerRef = useRef(router);
  const systemBackground = theme.system.getBackground(pathname, colors);

  routerRef.current = router;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(systemBackground);
  }, [systemBackground]);

  useEffect(() => {
    if (Platform.OS === "android") {
      const buttonStyle = resolvedTheme === "dark" ? "light" : "dark";
      void NavigationBar.setButtonStyleAsync(buttonStyle);
    }
  }, [resolvedTheme]);

  useEffect(() => {
    void ensureAuthReady();
    void refreshCourseCatalog();
  }, []);

  useEffect(() => {
    if (!auth.initialized) {
      return;
    }

    const isPublicAuthRoute =
      pathname === "/splash" ||
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname === "/forgot-password" ||
      pathname === "/" ||
      pathname === "/launch";

    setIsReady(true);

    const timer = setTimeout(() => {
      if (!auth.isAuthenticated) {
        if (!isPublicAuthRoute) {
          routerRef.current.replace("/splash");
        }
        return;
      }

      if (
        pathname === "/splash" ||
        pathname === "/login" ||
        pathname === "/signup" ||
        pathname === "/forgot-password" ||
        pathname === "/"
      ) {
        routerRef.current.replace("/home");
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [auth.initialized, auth.isAuthenticated, pathname]);

  const onLayoutRootView = useCallback(async () => {
    if (isReady && auth.initialized && themeInitialized) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady, auth.initialized, themeInitialized]);

  if (!themeInitialized) {
    return <View style={styles.fallback} />;
  }

  const stack = (
    <Stack screenOptions={({ route }) => theme.motion.getScreenOptions(route.name, colors)}>
      <Stack.Screen name="index" />
      <Stack.Screen name="launch" />
      <Stack.Screen name="home" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="favourites" />
      <Stack.Screen name="account" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="booking-history" />
      <Stack.Screen name="course-details" />
      <Stack.Screen name="manage-booking" />
      <Stack.Screen name="tee-time-booking" />
      <Stack.Screen name="booking-checkout" />
      <Stack.Screen name="payment-methods" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="splash" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );

  return (
    <SafeAreaProvider>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      {Platform.OS === "web" && (
        <style dangerouslySetInnerHTML={{ __html: `
          /* Custom styled scrollbars for a premium look */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background: ${resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.18)'};
            border-radius: 999px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: ${resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.3)'};
          }
          * {
            scrollbar-width: thin;
            scrollbar-color: ${resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.22) transparent' : 'rgba(0, 0, 0, 0.18) transparent'};
          }
        `}} />
      )}
      <View style={[styles.root, { backgroundColor: systemBackground }]} onLayout={onLayoutRootView}>
        <AppBottomTabs>{stack}</AppBottomTabs>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fallback: {
    flex: 1,
  },
});
