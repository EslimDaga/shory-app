import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { LOGO_BAR, LOGO_LETTERS, LOGO_VIEW_BOX } from '@/components/splash/logoGlyphs';

type Props = {
  width: number;
  color?: string;
  trackColor?: string;
  animateBar?: boolean;
  delay?: number;
};

const [VB_X, VB_Y, VB_W, VB_H] = LOGO_VIEW_BOX;
const VIEW_BOX = LOGO_VIEW_BOX.join(' ');

export function ShoryLogo({
  width,
  color = '#0A0A09',
  trackColor = 'rgba(10, 10, 9, 0.14)',
  animateBar = true,
  delay = 0,
}: Props) {
  const scale = width / VB_W;
  const height = VB_H * scale;
  const barLeft = (LOGO_BAR.x - VB_X) * scale;
  const barTop = (LOGO_BAR.y - VB_Y) * scale;
  const barWidth = LOGO_BAR.width * scale;
  const barHeight = LOGO_BAR.height * scale;
  const fillWidth = barWidth * LOGO_BAR.progress;
  const knobSize = LOGO_BAR.knobRadius * 2 * scale;

  const fill = useSharedValue(animateBar ? 0 : 1);
  const knob = useSharedValue(animateBar ? 0 : 1);

  useEffect(() => {
    if (!animateBar) return;
    fill.set(withDelay(delay, withTiming(1, { duration: 700, easing: Easing.inOut(Easing.cubic) })));
    knob.set(withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })));
  }, [animateBar, delay, fill, knob]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fill.value * fillWidth }, { scale: knob.value }],
  }));

  return (
    <View style={{ width, height }} accessibilityRole="image" accessibilityLabel="Shory">
      <Svg width={width} height={height} viewBox={VIEW_BOX}>
        {LOGO_LETTERS.map((d) => (
          <Path key={d} d={d} fill={color} />
        ))}
      </Svg>
      <View
        style={[
          styles.bar,
          { left: barLeft, top: barTop, width: barWidth, height: barHeight, borderRadius: barHeight / 2 },
          { backgroundColor: trackColor },
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          styles.fill,
          { left: barLeft, top: barTop, width: fillWidth, height: barHeight, borderRadius: barHeight / 2 },
          { backgroundColor: color },
          fillStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          {
            left: barLeft - knobSize / 2,
            top: barTop + barHeight / 2 - knobSize / 2,
            width: knobSize,
            height: knobSize,
            borderRadius: knobSize / 2,
            backgroundColor: color,
          },
          knobStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute' },
  fill: { transformOrigin: 'left center' },
});
