import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { withAlpha } from '@/utils/color';
import { formatDuration } from '@/utils/time';
import { LiquidGlass } from './glass/LiquidGlass';
import { getTonePalette } from './tonePalette';
import type { WidgetProps, WidgetTone } from './types';

export const PLAYER_SIZE = { width: 352, height: 212 };

const INSET = 6;
const PROGRESS = 0.42;
const FALLBACK_DURATION_MS = 200000;
const COVER_BLUR = 30;

const TINTS: Partial<Record<WidgetTone, string>> = {
  dark: 'rgba(28, 28, 26, 0.5)',
  light: 'rgba(247, 244, 238, 0.76)',
};

export function PlayerWidget({ track, tone }: WidgetProps) {
  const palette = getTonePalette(tone, track.accentColor);
  const durationMs = track.durationMs ?? FALLBACK_DURATION_MS;
  const elapsedMs = durationMs * PROGRESS;
  const iconColor = withAlpha(palette.onSurface, 0.9);
  const tint = TINTS[tone];

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.card,
          {
            borderColor: tone === 'glass' ? 'rgba(255, 255, 255, 0.42)' : palette.hairline,
            backgroundColor: tone === 'accent' ? palette.surface : 'transparent',
          },
        ]}
      >
        {tone === 'glass' && (
          <LiquidGlass
            widgetWidth={PLAYER_SIZE.width}
            widgetHeight={PLAYER_SIZE.height}
            inset={INSET}
            fallbackImageUri={track.coverUrl}
          />
        )}
        {tint && (
          <>
            <Image source={{ uri: track.coverUrl }} style={styles.coverBackdrop} blurRadius={COVER_BLUR} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
          </>
        )}

        <View style={styles.header}>
          <Image source={{ uri: track.coverUrl }} style={styles.cover} />
          <View style={styles.titles}>
            <Text style={[styles.title, { color: palette.onSurface }]} numberOfLines={1}>
              {track.title}
            </Text>
            {track.artist ? (
              <Text style={[styles.artist, { color: palette.onSurfaceMuted }]} numberOfLines={1}>
                {track.artist}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.progressRow}>
          <Text style={[styles.time, { color: palette.onSurfaceMuted }]}>
            {formatDuration(elapsedMs)}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: palette.track }]}>
            <View style={[styles.progressFill, { backgroundColor: withAlpha(palette.onSurface, 0.85) }]} />
          </View>
          <Text style={[styles.time, { color: palette.onSurfaceMuted }]}>
            –{formatDuration(durationMs - elapsedMs)}
          </Text>
        </View>

        <View style={styles.controls}>
          <View style={styles.sideSlot} />
          <View style={styles.transport}>
            <SkipIcon color={iconColor} flipped />
            <PauseIcon color={iconColor} />
            <SkipIcon color={iconColor} />
          </View>
          <View style={styles.sideSlot}>
            <AirPlayIcon color={withAlpha(palette.onSurface, 0.6)} />
          </View>
        </View>
      </View>
    </View>
  );
}

function SkipIcon({ color, flipped }: { color: string; flipped?: boolean }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" fill={color} style={flipped ? styles.flipped : undefined}>
      <Path d="M12.8 6.8v10.4c0 .8.9 1.3 1.6.8l6.7-5.2a1 1 0 0 0 0-1.6l-6.7-5.2c-.7-.5-1.6 0-1.6.8Z" stroke={color} strokeLinejoin="round" />
      <Path d="M3 6.8v10.4c0 .8.9 1.3 1.6.8l6.7-5.2a1 1 0 0 0 0-1.6L4.6 6c-.7-.5-1.6 0-1.6.8Z" stroke={color} strokeLinejoin="round" />
    </Svg>
  );
}

function PauseIcon({ color }: { color: string }) {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill={color}>
      <Rect x={5.6} y={3.5} width={4.6} height={17} rx={1.4} />
      <Rect x={13.8} y={3.5} width={4.6} height={17} rx={1.4} />
    </Svg>
  );
}

function AirPlayIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <Path d="M7.1 17.2a7.5 7.5 0 1 1 9.8 0" />
      <Path d="M9.2 14.6a4.2 4.2 0 1 1 5.6 0" />
      <Circle cx={12} cy={11.5} r={1} fill={color} stroke="none" />
      <Path d="M12 15.8 16.2 21H7.8Z" fill={color} stroke="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    width: PLAYER_SIZE.width,
    height: PLAYER_SIZE.height,
    padding: INSET,
    backgroundColor: 'transparent',
  },
  card: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  coverBackdrop: {
    ...StyleSheet.absoluteFill,
    transform: [{ scale: 1.3 }],
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cover: { width: 64, height: 64, borderRadius: 11, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  titles: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  artist: { fontSize: 15, fontWeight: '400', letterSpacing: -0.3, marginTop: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  time: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { width: `${PROGRESS * 100}%`, height: '100%', borderRadius: 3 },
  controls: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  sideSlot: { width: 32, alignItems: 'flex-end' },
  transport: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 38 },
  flipped: { transform: [{ scaleX: -1 }] },
});
