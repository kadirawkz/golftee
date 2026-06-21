import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/launch");
  }, [router]);

  return null;
}
