import { useWindowDimensions } from "react-native";

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isCompact = width < 360;
  const isTabletLike = width >= 768;
  const isDesktop = width >= 1024;

  const maxContentWidth = isDesktop ? 1200 : isTabletLike ? 900 : width;
  const horizontalPadding = isTabletLike ? Math.max((width - maxContentWidth) / 2, 24) : isCompact ? 12 : 16;
  const screenBottomPadding = isTabletLike ? 100 : isCompact ? 132 : 160;
  const cardPadding = isTabletLike ? 18 : isCompact ? 12 : 16;
  const touchTargetMin = isCompact ? 44 : 40;
  const compactHitSlop = isCompact ? 8 : 6;

  const scaleFont = (size: number) => {
    if (isDesktop) {
      return Math.round(size * 1.10);
    }
    if (isTabletLike) {
      return Math.round(size * 1.06);
    }
    if (isCompact) {
      return Math.round(size * 0.94);
    }
    return size;
  };

  const scaleLineHeight = (lineHeight: number) => {
    if (isDesktop) {
      return Math.round(lineHeight * 1.10);
    }
    if (isTabletLike) {
      return Math.round(lineHeight * 1.06);
    }
    if (isCompact) {
      return Math.round(lineHeight * 0.94);
    }
    return lineHeight;
  };

  return {
    width,
    height,
    isCompact,
    isTabletLike,
    isDesktop,
    maxContentWidth,
    horizontalPadding,
    screenBottomPadding,
    cardPadding,
    touchTargetMin,
    compactHitSlop,
    scaleFont,
    scaleLineHeight,
  };
}

