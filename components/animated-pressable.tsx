import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Animated,
  Pressable as RNPressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { theme, type PressableMotionVariant } from "./theme";

type AnimatedPressableProps = Omit<PressableProps, "children" | "style"> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: PressableMotionVariant;
};

const AnimatedBasePressable = Animated.createAnimatedComponent(RNPressable);

export function AnimatedPressable({
  children,
  style,
  variant = "button",
  disabled = false,
  onPressIn,
  onPressOut,
  hitSlop,
  ...props
}: AnimatedPressableProps) {
  const { compactHitSlop } = useResponsiveLayout();
  const pressProgress = useRef(new Animated.Value(0)).current;
  const config = theme.motion.pressable[variant];
  const resolvedHitSlop =
    hitSlop ?? (variant === "icon" || variant === "chip" || variant === "tab" ? compactHitSlop : undefined);

  const animateTo = useCallback(
    (toValue: number) => {
      Animated.spring(pressProgress, {
        toValue,
        stiffness: config.stiffness,
        damping: config.damping,
        mass: config.mass,
        useNativeDriver: true,
      }).start();
    },
    [config.damping, config.mass, config.stiffness, pressProgress]
  );

  useEffect(() => {
    if (disabled) {
      animateTo(0);
    }
  }, [animateTo, disabled]);

  const animatedStyle = useMemo(
    () => ({
      opacity: pressProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, config.opacity],
      }),
      transform: [
        {
          scale: pressProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, config.scale],
          }),
        },
        {
          translateY: pressProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, config.translateY],
          }),
        },
      ],
    }),
    [config.opacity, config.scale, config.translateY, pressProgress]
  );

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      if (!disabled) {
        animateTo(1);
      }
      onPressIn?.(event);
    },
    [animateTo, disabled, onPressIn]
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      animateTo(0);
      onPressOut?.(event);
    },
    [animateTo, onPressOut]
  );

  return (
    <AnimatedBasePressable
      {...props}
      disabled={disabled}
      hitSlop={resolvedHitSlop}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle, disabled && styles.disabled]}
    >
      {children}
    </AnimatedBasePressable>
  );
}

const styles = {
  disabled: {
    opacity: 0.7,
  },
} satisfies Record<string, ViewStyle>;
