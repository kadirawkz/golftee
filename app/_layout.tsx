import "../components/ignore-warnings";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SystemUI from "expo-system-ui";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppBottomTabs } from "../components/app-bottom-tabs";
import { ensureAuthReady, useAuthSession } from "../components/auth";
import { refreshCourseCatalog } from "../components/course-management";
import { theme } from "../components/theme";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuthSession();
  const [isReady, setIsReady] = useState(false);
  const routerRef = useRef(router);
  const systemBackground = theme.system.getBackground(pathname);

  routerRef.current = router;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(systemBackground);
  }, [systemBackground]);

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

  if (!isReady || !auth.initialized) {
    return <View style={[styles.fallback, { backgroundColor: systemBackground }]} />;
  }

  const stack = (
    <Stack screenOptions={({ route }) => theme.motion.getScreenOptions(route.name)}>
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
      <Stack.Screen name="notifications" />
      <Stack.Screen name="splash" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );

  return (
    <SafeAreaProvider>
      <View style={[styles.root, { backgroundColor: systemBackground }]}>
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
