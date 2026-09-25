import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

export type ScreenTransitionVariant = 'zoom' | 'rise';

type Props = {
  variant: ScreenTransitionVariant;
  children: ReactNode;
};

const DURATION_MS = 280;
const ZOOM_FROM = 0.96;
const RISE_FROM = 24;

export function ScreenTransition({ variant, children }: Props) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress]);

  const transform =
    variant === 'zoom'
      ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [ZOOM_FROM, 1] }) }]
      : [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [RISE_FROM, 0] }) }];

  return (
    <Animated.View style={[styles.screen, { opacity: progress, transform }]}>{children}</Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
