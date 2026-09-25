import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { SourceLogo } from '@/components/SourceLogo';
import { LiquidGlass } from './glass/LiquidGlass';
import { getTonePalette } from './tonePalette';
import type { WidgetProps } from './types';

export const PILL_SIZE = { width: 336, height: 92 };

const INSET = 10;

const BARS = [0.45, 0.9, 0.6, 1, 0.35, 0.75, 0.5];

export function PillWidget({ track, tone }: WidgetProps) {
  const palette = getTonePalette(tone, track.accentColor);

  return (
    <View style={styles.root}>
      <View style={styles.shadow}>
        <View
          style={[
            styles.pill,
            {
              backgroundColor: tone === 'glass' ? 'transparent' : palette.surface,
              borderColor: tone === 'glass' ? 'rgba(255, 255, 255, 0.42)' : palette.hairline,
            },
          ]}
        >
          {tone === 'glass' && (
            <LiquidGlass
              widgetWidth={PILL_SIZE.width}
              widgetHeight={PILL_SIZE.height}
              inset={INSET}
              fallbackImageUri={track.coverUrl}
            />
          )}
          <Image source={{ uri: track.coverUrl }} style={styles.cover} />
          <View style={styles.info}>
            <Text style={[styles.title, { color: palette.onSurface }]} numberOfLines={1}>
              {track.title}
            </Text>
            {track.artist ? (
              <Text style={[styles.artist, { color: palette.onSurfaceMuted }]} numberOfLines={1}>
                {track.artist}
              </Text>
            ) : null}
          </View>
          <Svg width={34} height={24} viewBox="0 0 34 24">
            {BARS.map((h, i) => (
              <Rect
                key={i}
                x={i * 5}
                y={24 - h * 24}
                width={3}
                height={h * 24}
                rx={1.5}
                fill={palette.onSurface}
                opacity={0.85}
              />
            ))}
          </Svg>
          <SourceLogo source={track.source} size={26} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: PILL_SIZE.width,
    height: PILL_SIZE.height,
    padding: INSET,
    backgroundColor: 'transparent',
  },
  shadow: {
    flex: 1,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 8,
    paddingRight: 18,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cover: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0, 0, 0, 0.25)' },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  artist: { fontSize: 13, fontWeight: '500', marginTop: 1 },
});
