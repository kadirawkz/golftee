import { Image, type ImageProps } from "expo-image";

const PRESET_MAP: Record<string, any> = {
  "preset:classic_golfer": require("../assets/images/presets/classic_golfer.webp"),
  "preset:club_house": require("../assets/images/presets/club_house.webp"),
  "preset:fairway": require("../assets/images/presets/fairway.webp"),
  "preset:tee_shot": require("../assets/images/presets/tee_shot.webp"),
};

export function AppImage(props: ImageProps) {
  let resolvedSource = props.source;
  
  if (
    resolvedSource && 
    typeof resolvedSource === 'object' && 
    !Array.isArray(resolvedSource) && 
    'uri' in resolvedSource &&
    typeof resolvedSource.uri === 'string' &&
    resolvedSource.uri.startsWith('preset:')
  ) {
    const localAsset = PRESET_MAP[resolvedSource.uri];
    if (localAsset) {
      resolvedSource = localAsset;
    }
  }

  return <Image cachePolicy="memory-disk" contentFit="cover" transition={0} {...props} source={resolvedSource} />;
}
