import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Headphones } from 'phosphor-react-native/src/icons/Headphones';
import { Pause } from 'phosphor-react-native/src/icons/Pause';
import { X } from 'phosphor-react-native/src/icons/X';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { levelAt, useStoryClock } from '@/components/motion/StoryClock';
import { FALLBACK_ACCENT } from '@/constants/storyBackgrounds';
import { strings } from '@/i18n/es';
import { isLightColor, mixColors } from '@/utils/color';
import { formatDuration } from '@/utils/time';
import { playbackPosition } from '../playback';
import { readData, toNumber, type WidgetProps } from '../types';

// Dynamic Island, after the iOS 17 Dynamic Island Components kit (Figma Community): the island is
// always pure black with white type, like the real one, so these widgets have no tone of their
// own. The music waveform takes the cover's color, as iOS does.

export const ISLAND_EXPANDED = { width: 360, height: 196 };
export const ISLAND_COMPACT = { width: 360, height: 96 };

const INSET = 10;
const WHITE = '#FFFFFF';
const MUTED = 'rgba(235, 235, 245, 0.6)';
const TRACK = 'rgba(255, 255, 255, 0.22)';
const IOS_GREEN = '#32D74B';
const IOS_ORANGE = '#FF9F0A';

function Island({
  size,
  radius,
  children,
}: {
  size: { width: number; height: number };
  radius: number;
  children: ReactNode;
}) {
  const { height } = size;
  return (
    <View style={[styles.root, size]}>
      <View style={[styles.island, { height: height - INSET * 2, borderRadius: radius }]}>{children}</View>
    </View>
  );
}

// The cover's color, lifted so it glows on black even when the cover is dark.
function waveColor(accent: string | null): string {
  const color = accent ?? FALLBACK_ACCENT;
  return isLightColor(color) ? color : mixColors(color, '#FFFFFF', 0.35);
}

const WAVE_BARS = [0.35, 0.6, 0.9, 0.55, 1, 0.7, 0.45];

// Equalizer bars: still in a photo, dancing with the story clock in a video.
function Waveform({ color, height }: { color: string; height: number }) {
  const time = useStoryClock();
  const barWidth = height * 0.12;
  return (
    <View style={[styles.wave, { height, gap: barWidth * 0.85 }]}>
      {WAVE_BARS.map((rest, index) => (
        <View
          key={index}
          style={{
            width: barWidth,
            height,
            borderRadius: barWidth / 2,
            backgroundColor: color,
            transform: [{ scaleY: time === null ? rest : levelAt(index, rest, time) }],
          }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------

export function IslandNowPlayingWidget({ track, progress = 0.42 }: WidgetProps) {
  const clock = useStoryClock();
  const { shown, elapsedMs, remainingMs } = playbackPosition(track.durationMs, progress, clock);
  return (
    <Island size={ISLAND_EXPANDED} radius={48}>
      <View style={styles.expanded}>
        <View style={styles.nowRow}>
          <Image source={{ uri: track.coverUrl }} style={styles.cover} />
          <View style={styles.titles}>
            <Text style={styles.title} numberOfLines={1}>
              {track.title}
            </Text>
            {track.artist ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {track.artist}
              </Text>
            ) : null}
          </View>
          <Waveform color={waveColor(track.accentColor)} height={24} />
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.time}>{formatDuration(elapsedMs)}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${shown * 100}%` }]} />
          </View>
          <Text style={styles.time}>-{formatDuration(remainingMs)}</Text>
        </View>

        <View style={styles.controls}>
          <View style={styles.controlSide} />
          <SkipGlyph flipped />
          <PauseGlyph />
          <SkipGlyph />
          <View style={[styles.controlSide, styles.controlEnd]}>
            <AirPlayGlyph />
          </View>
        </View>
      </View>
    </Island>
  );
}

export function IslandMusicWidget({ track }: WidgetProps) {
  return (
    <Island size={ISLAND_COMPACT} radius={40}>
      <View style={styles.compact}>
        <Image source={{ uri: track.coverUrl }} style={styles.compactCover} />
        <View style={styles.titles}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {track.title}
          </Text>
          {track.artist ? (
            <Text style={styles.compactSubtitle} numberOfLines={1}>
              {track.artist}
            </Text>
          ) : null}
        </View>
        <Waveform color={waveColor(track.accentColor)} height={26} />
      </View>
    </Island>
  );
}

export const AIRPODS_DEFAULTS = { device: 'AirPods Pro', battery: '75' };

export function IslandAirPodsWidget({ data }: WidgetProps) {
  const values = readData(AIRPODS_DEFAULTS, data);
  const battery = Math.min(100, Math.max(0, Math.round(toNumber(values.battery, 75))));
  return (
    <Island size={ISLAND_COMPACT} radius={40}>
      <View style={styles.compact}>
        <Headphones size={30} color={WHITE} weight="fill" />
        <View style={styles.titles}>
          <Text style={styles.compactSubtitle} numberOfLines={1}>
            {strings.widgets.island.airpods.connected}
          </Text>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {values.device}
          </Text>
        </View>
        <BatteryRing percent={battery} />
      </View>
    </Island>
  );
}

function BatteryRing({ percent }: { percent: number }) {
  const size = 50;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = percent <= 20 ? '#FF453A' : IOS_GREEN;
  return (
    <View style={styles.battery}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={TRACK} strokeWidth={stroke} fill="none" />
        {/* A zero-length round-capped stroke still draws a dot, so an empty battery gets no arc. */}
        {percent > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${(circumference * percent) / 100} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <Text style={[styles.batteryText, { color }]}>{percent}%</Text>
    </View>
  );
}

export const TIMER_DEFAULTS = { label: 'Entreno', time: '3:35' };

export function IslandTimerWidget({ data }: WidgetProps) {
  const values = readData(TIMER_DEFAULTS, data);
  return (
    <Island size={ISLAND_COMPACT} radius={40}>
      <View style={styles.compact}>
        <View style={[styles.roundButton, styles.pauseButton]}>
          <Pause size={22} color={IOS_ORANGE} weight="fill" />
        </View>
        <View style={[styles.roundButton, styles.closeButton]}>
          <X size={20} color={WHITE} weight="bold" />
        </View>
        <View style={styles.timerText}>
          <Text style={styles.timerLabel} numberOfLines={1}>
            {values.label}
          </Text>
          <Text style={styles.timerValue} numberOfLines={1}>
            {values.time}
          </Text>
        </View>
      </View>
    </Island>
  );
}

// ---------------------------------------------------------------------------------------------

function SkipGlyph({ flipped }: { flipped?: boolean }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" fill={WHITE} style={flipped ? styles.flipped : undefined}>
      <Path d="M12.8 6.8v10.4c0 .8.9 1.3 1.6.8l6.7-5.2a1 1 0 0 0 0-1.6l-6.7-5.2c-.7-.5-1.6 0-1.6.8Z" />
      <Path d="M3 6.8v10.4c0 .8.9 1.3 1.6.8l6.7-5.2a1 1 0 0 0 0-1.6L4.6 6c-.7-.5-1.6 0-1.6.8Z" />
    </Svg>
  );
}

function PauseGlyph() {
  return (
    <Svg width={38} height={38} viewBox="0 0 24 24" fill={WHITE}>
      <Rect x={5.6} y={3.5} width={4.6} height={17} rx={1.4} />
      <Rect x={13.8} y={3.5} width={4.6} height={17} rx={1.4} />
    </Svg>
  );
}

function AirPlayGlyph() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth={1.8}>
      <Circle cx={12} cy={11} r={2.4} fill={WHITE} stroke="none" />
      <Path d="M7.8 15.2a6 6 0 1 1 8.4 0" strokeLinecap="round" />
      <Path d="M5 18a9.8 9.8 0 1 1 14 0" strokeLinecap="round" />
      <Path d="M12 15.5 8.5 20h7Z" fill={WHITE} stroke="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { padding: INSET, justifyContent: 'center' },
  // boxShadow rather than shadow*: with overflow hidden, iOS clips a layer shadow away, but it draws
  // a boxShadow outside and moves the clipping to an inner view.
  island: {
    backgroundColor: '#000000',
    overflow: 'hidden',
    boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.35)',
  },
  expanded: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 14,
    justifyContent: 'space-between',
  },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cover: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#1C1C1E' },
  titles: { flex: 1, justifyContent: 'center' },
  title: { color: WHITE, fontSize: 17, fontWeight: '600', letterSpacing: -0.4 },
  subtitle: { color: MUTED, fontSize: 15, fontWeight: '500', letterSpacing: -0.2, marginTop: 1 },
  wave: { flexDirection: 'row', alignItems: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  time: { color: MUTED, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'], minWidth: 36 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: TRACK, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: WHITE },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  controlSide: { width: 34 },
  controlEnd: { alignItems: 'flex-end' },
  flipped: { transform: [{ scaleX: -1 }] },
  compact: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  compactCover: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1C1C1E' },
  compactTitle: { color: WHITE, fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  compactSubtitle: { color: MUTED, fontSize: 13, fontWeight: '500', letterSpacing: -0.1 },
  battery: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  batteryText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  roundButton: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  pauseButton: { backgroundColor: 'rgba(255, 159, 10, 0.3)' },
  closeButton: { backgroundColor: 'rgba(255, 255, 255, 0.24)' },
  timerText: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', gap: 8 },
  timerLabel: { color: IOS_ORANGE, fontSize: 16, fontWeight: '600' },
  timerValue: {
    color: IOS_ORANGE,
    fontSize: 36,
    fontWeight: '600',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
});
