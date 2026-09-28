import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Path, Rect } from 'react-native-svg';
import { levelAt, useStoryClock } from '@/components/motion/StoryClock';
import { SourceLogo } from '@/components/SourceLogo';
import { withAlpha } from '@/utils/color';
import { formatDuration } from '@/utils/time';
import { AudioDeviceIcon, BluetoothOutputIcon } from './AudioDeviceIcon';
import { LiquidGlass } from './glass/LiquidGlass';
import { playbackPosition } from './playback';
import { ToneFill } from './ToneFill';
import { getTonePalette } from './tonePalette';
import type { WidgetProps } from './types';

export const PLAYER_SIZE = { width: 352, height: 200 };

const INSET = 6;
const PROGRESS = 0.42;

type PlayerWidgetProps = WidgetProps & {
  liveLevels?: boolean;
  playing?: boolean;
};

export function PlayerWidget({
  track,
  tone,
  outputDevice,
  liveLevels = false,
  playing,
  progress = PROGRESS,
  hideCover = false,
  hideTimes = false,
}: PlayerWidgetProps) {
  const clock = useStoryClock();
  const palette = getTonePalette(tone, track.accentColor);
  const { durationMs, shown, elapsedMs, remainingMs } = playbackPosition(track.durationMs, progress, clock);
  const iconColor = withAlpha(palette.onSurface, 0.9);

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.card,
          {
            borderColor: tone === 'glass' ? 'rgba(255, 255, 255, 0.42)' : palette.hairline,
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
        {tone !== 'glass' && <ToneFill palette={palette} id="player" />}

        <View style={styles.header}>
          {!hideCover && <Image source={{ uri: track.coverUrl }} style={styles.cover} />}
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
          {clock !== null ? (
            <ClockLevelsIcon color={palette.onSurface} time={clock} />
          ) : liveLevels ? (
            <LiveLevelsIcon color={palette.onSurface} />
          ) : (
            <LevelsIcon color={palette.onSurface} />
          )}
        </View>

        {playing === undefined ? (
          <View style={styles.progressRow}>
            {!hideTimes && (
              <Text style={[styles.time, { color: palette.onSurfaceMuted }]}>
                {formatDuration(elapsedMs)}
              </Text>
            )}
            <View style={[styles.progressTrack, { backgroundColor: palette.track }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${shown * 100}%`, backgroundColor: withAlpha(palette.onSurface, 0.85) },
                ]}
              />
            </View>
            {!hideTimes && (
              <Text style={[styles.time, { color: palette.onSurfaceMuted }]}>
                –{formatDuration(remainingMs)}
              </Text>
            )}
          </View>
        ) : (
          <LiveProgressRow
            playing={playing}
            startAt={progress}
            durationMs={durationMs}
            timeColor={palette.onSurfaceMuted}
            trackColor={palette.track}
            fillColor={withAlpha(palette.onSurface, 0.85)}
          />
        )}

        <View style={styles.controls}>
          <View style={[styles.sideSlot, styles.leadingSlot]}>
            <SourceLogo source={track.source} size={24} />
          </View>
          <View style={styles.transport}>
            <SkipIcon color={iconColor} flipped />
            <PauseIcon color={iconColor} />
            <SkipIcon color={iconColor} />
          </View>
          <View style={styles.sideSlot}>
            {outputDevice ? (
              <AudioDeviceIcon device={outputDevice} color={withAlpha(palette.onSurface, 0.75)} size={24} />
            ) : (
              <BluetoothOutputIcon color={withAlpha(palette.onSurface, 0.6)} />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// The outgoing slide keeps playing while it crossfades away, then pauses in place.
const PAUSE_DELAY_MS = 700;

function LiveProgressRow({
  playing,
  startAt,
  durationMs,
  timeColor,
  trackColor,
  fillColor,
}: {
  playing: boolean;
  startAt: number;
  durationMs: number;
  timeColor: string;
  trackColor: string;
  fillColor: string;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(startAt);
  const trackWidth = useSharedValue(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(Math.floor((startAt * durationMs) / 1000));

  useEffect(() => {
    if (reduceMotion) return;
    if (playing) {
      // Resume from wherever this song was left, at real speed. It never rewinds.
      const remaining = 1 - progress.value;
      progress.value = withTiming(1, { duration: durationMs * remaining, easing: Easing.linear });
      return;
    }
    const pause = setTimeout(() => cancelAnimation(progress), PAUSE_DELAY_MS);
    return () => clearTimeout(pause);
  }, [playing, durationMs, progress, reduceMotion]);

  // Only the clock crosses to JS, and only when the displayed second actually changes.
  useAnimatedReaction(
    () => Math.floor((progress.value * durationMs) / 1000),
    (seconds, previous) => {
      if (seconds !== previous) scheduleOnRN(setElapsedSeconds, seconds);
    },
  );

  const fillStyle = useAnimatedStyle(() => ({
    opacity: trackWidth.value > 0 ? 1 : 0,
    transform: [{ translateX: (progress.value - 1) * trackWidth.value }],
  }));

  const onTrackLayout = (event: LayoutChangeEvent) => {
    trackWidth.value = event.nativeEvent.layout.width;
  };

  const elapsedMs = elapsedSeconds * 1000;

  return (
    <View style={styles.progressRow}>
      <Text style={[styles.time, { color: timeColor }]}>{formatDuration(elapsedMs)}</Text>
      <View style={[styles.progressTrack, { backgroundColor: trackColor }]} onLayout={onTrackLayout}>
        <Animated.View style={[styles.liveFill, { backgroundColor: fillColor }, fillStyle]} />
      </View>
      <Text style={[styles.time, { color: timeColor }]}>–{formatDuration(durationMs - elapsedMs)}</Text>
    </View>
  );
}

function SkipIcon({ color, flipped }: { color: string; flipped?: boolean }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" fill={color} style={flipped ? styles.flipped : undefined}>
      <Path
        d="M12.8 6.8v10.4c0 .8.9 1.3 1.6.8l6.7-5.2a1 1 0 0 0 0-1.6l-6.7-5.2c-.7-.5-1.6 0-1.6.8Z"
        stroke={color}
        strokeLinejoin="round"
      />
      <Path
        d="M3 6.8v10.4c0 .8.9 1.3 1.6.8l6.7-5.2a1 1 0 0 0 0-1.6L4.6 6c-.7-.5-1.6 0-1.6.8Z"
        stroke={color}
        strokeLinejoin="round"
      />
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

const LEVEL_BARS = [
  { height: 7, opacity: 0.45 },
  { height: 10, opacity: 0.55 },
  { height: 13, opacity: 0.6 },
  { height: 9, opacity: 0.5 },
  { height: 17, opacity: 0.85 },
  { height: 22, opacity: 0.7 },
  { height: 11, opacity: 0.5 },
];

const LEVEL_BAR_WIDTH = 2.4;
const LEVEL_GAP = 2.4;
const LEVEL_HEIGHT = 24;
const LEVEL_MAX = Math.max(...LEVEL_BARS.map((bar) => bar.height));

function LevelsIcon({ color }: { color: string }) {
  const width = LEVEL_BARS.length * LEVEL_BAR_WIDTH + (LEVEL_BARS.length - 1) * LEVEL_GAP;
  return (
    <Svg width={width} height={LEVEL_HEIGHT} viewBox={`0 0 ${width} ${LEVEL_HEIGHT}`}>
      {LEVEL_BARS.map((bar, index) => (
        <Rect
          key={index}
          x={index * (LEVEL_BAR_WIDTH + LEVEL_GAP)}
          y={(LEVEL_HEIGHT - bar.height) / 2}
          width={LEVEL_BAR_WIDTH}
          height={bar.height}
          rx={LEVEL_BAR_WIDTH / 2}
          fill={color}
          opacity={bar.opacity}
        />
      ))}
    </Svg>
  );
}

function ClockLevelsIcon({ color, time }: { color: string; time: number }) {
  return (
    <View style={styles.levels}>
      {LEVEL_BARS.map((bar, index) => (
        <View
          key={index}
          style={[
            styles.levelBar,
            {
              backgroundColor: color,
              opacity: bar.opacity,
              transform: [{ scaleY: levelAt(index, bar.height / LEVEL_MAX, time) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

function LiveLevelsIcon({ color }: { color: string }) {
  return (
    <View style={styles.levels}>
      {LEVEL_BARS.map((bar, index) => (
        <LiveLevelBar
          key={index}
          index={index}
          rest={bar.height / LEVEL_MAX}
          opacity={bar.opacity}
          color={color}
        />
      ))}
    </View>
  );
}

function LiveLevelBar({
  index,
  rest,
  opacity,
  color,
}: {
  index: number;
  rest: number;
  opacity: number;
  color: string;
}) {
  const reduceMotion = useReducedMotion();
  const level = useSharedValue(rest);

  useEffect(() => {
    if (reduceMotion) return;
    // Each bar gets its own rhythm so the meter never looks like it's looping.
    const beat = 260 + ((index * 97) % 180);
    const peak = Math.min(1, rest + 0.45);
    const dip = Math.max(0.18, rest - 0.4);
    const ease = Easing.inOut(Easing.quad);
    level.value = withDelay(
      index * 70,
      withRepeat(
        withSequence(
          withTiming(peak, { duration: beat, easing: ease }),
          withTiming(dip, { duration: beat * 1.3, easing: ease }),
          withTiming((peak + rest) / 2, { duration: beat * 0.9, easing: ease }),
          withTiming(rest, { duration: beat, easing: ease }),
        ),
        -1,
      ),
    );
  }, [index, level, rest, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: level.value }] }));

  return <Animated.View style={[styles.levelBar, { backgroundColor: color, opacity }, animatedStyle]} />;
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
    justifyContent: 'center',
    paddingHorizontal: 18,
    // Extra top padding offsets the transparent inset inside the transport icons' viewBox,
    // so the visible gap above the cover matches the one below the controls.
    paddingTop: 19,
    paddingBottom: 13,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cover: { width: 64, height: 64, borderRadius: 11, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  titles: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  artist: { fontSize: 15, fontWeight: '400', letterSpacing: -0.3, marginTop: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  time: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  liveFill: { width: '100%', height: '100%', borderRadius: 3 },
  controls: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  sideSlot: { width: 34, alignItems: 'flex-end' },
  leadingSlot: { alignItems: 'flex-start' },
  transport: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 38 },
  flipped: { transform: [{ scaleX: -1 }] },
  levels: { flexDirection: 'row', alignItems: 'center', gap: LEVEL_GAP, height: LEVEL_HEIGHT },
  levelBar: { width: LEVEL_BAR_WIDTH, height: LEVEL_MAX, borderRadius: LEVEL_BAR_WIDTH / 2 },
});
