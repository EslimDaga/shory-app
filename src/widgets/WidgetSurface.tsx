import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { TrackMetadata } from '@/types/music';
import { LiquidGlass } from './glass/LiquidGlass';
import { useSvgId } from './svgId';
import { ToneFill } from './ToneFill';
import { getTonePalette } from './tonePalette';
import type { WidgetTone } from './types';

const SURFACE_INSET = 10;

type Props = {
  track: TrackMetadata;
  tone: WidgetTone;
  width: number;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  // The fitness look: the song color falling into black from this point (fractions of the card),
  // as in the Fitness Widget Pack. Only on the song tone; the other tones stay flat.
  vignette?: { x: number; y: number };
  children: ReactNode;
};

// The card every data widget sits on: same inset, shadow and tones as the music player, so a
// weather or match widget reads as part of the same family.
export function WidgetSurface({ track, tone, width, height, radius = 30, style, vignette, children }: Props) {
  const palette = getTonePalette(tone, track.accentColor);
  const glass = tone === 'glass';

  return (
    <View style={{ width, height, padding: SURFACE_INSET }}>
      <View style={[styles.shadow, { borderRadius: radius }]}>
        <View
          style={[
            styles.card,
            {
              borderRadius: radius,
              borderColor: glass ? 'rgba(255, 255, 255, 0.42)' : palette.hairline,
            },
            style,
          ]}
        >
          {!glass && <ToneFill palette={palette} id="surface" />}
          {vignette && tone === 'accent' && <Vignette {...vignette} />}
          {glass && (
            <LiquidGlass
              widgetWidth={width}
              widgetHeight={height}
              inset={SURFACE_INSET}
              fallbackImageUri={track.coverUrl}
            />
          )}
          {children}
        </View>
      </View>
    </View>
  );
}

function Vignette({ x, y }: { x: number; y: number }) {
  const gradientId = useSvgId('surface-vignette');
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={gradientId} cx={x} cy={y} rx={1.05} ry={1.05} fx={x} fy={y}>
            <Stop offset="0" stopColor="#000000" stopOpacity={0.92} />
            <Stop offset="0.55" stopColor="#000000" stopOpacity={0.45} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    flex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  card: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
});
