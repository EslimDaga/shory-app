import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSvgId } from './svgId';
import type { TonePalette } from './tonePalette';

// The card's background for the solid tones: black, white, or the song's color as a gradient.
// Liquid glass draws its own (LiquidGlass), so it gets nothing here.
export function ToneFill({ palette, id }: { palette: TonePalette; id: string }) {
  const gradientId = useSvgId(`tone-${id}`);
  if (!palette.surfaceBottom) {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]} />
    );
  }
  // The Svg sits in its own padding-free layer: on a card with padding, an Svg sized "100%"
  // measures against the padded content box and stops short of the right and bottom edges.
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor={palette.surface} />
            <Stop offset="1" stopColor={palette.surfaceBottom} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}
