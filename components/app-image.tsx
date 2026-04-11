import { Image, type ImageProps } from "expo-image";

export function AppImage(props: ImageProps) {
  return <Image cachePolicy="memory-disk" contentFit="cover" transition={0} {...props} />;
}
