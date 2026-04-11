import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../components/theme";

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/launch");
  }, [router]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.page,
  },
});
