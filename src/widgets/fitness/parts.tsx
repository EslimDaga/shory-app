import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { withAlpha } from '@/utils/color';
import { useSvgId } from '../svgId';
import type { TonePalette } from '../tonePalette';

// Building blocks shared by the fitness widgets, drawn after the Fitness Widget Pack (Figma
// Community): a label on top, one big number with a small unit, and a single chart. Everything
// is drawn in the card's ink color at a few opacities, so each tone (glass, black, white, song
// color) reads cleanly without extra colors of its own.

export const FIT_SMALL = { width: 184, height: 184 };
export const FIT_TALL = { width: 184, height: 238 };
export const FIT_MEDIUM = { width: 368, height: 184 };

export const FIT_RADIUS = 26;
// What's left inside a medium card for its content (card width, inset and side padding).
export const FIT_MEDIUM_CONTENT = FIT_MEDIUM.width - 20 - 36;

export function Label({
  palette,
  children,
  style,
}: {
  palette: TonePalette;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[styles.label, { color: palette.onSurface }, style]} numberOfLines={1}>
      {children}
    </Text>
  );
}

export function Caption({
  palette,
  children,
  style,
}: {
  palette: TonePalette;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[styles.caption, { color: palette.onSurfaceMuted }, style]} numberOfLines={1}>
      {children}
    </Text>
  );
}

// "13.450 pasos": the number big, the unit small and muted, sharing one baseline.
export function Value({
  palette,
  value,
  unit,
  size = 40,
  style,
}: {
  palette: TonePalette;
  value: string;
  unit?: string;
  size?: number;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[styles.value, { color: palette.onSurface, fontSize: size }, style]} numberOfLines={1}>
      {value}
      {unit ? (
        <Text style={[styles.unit, { color: palette.onSurfaceMuted, fontSize: Math.max(12, size * 0.36) }]}>
          {` ${unit}`}
        </Text>
      ) : null}
    </Text>
  );
}

// A number over its small caption, for rows of stats ("3h 19m / Duración").
export function Stat({
  palette,
  value,
  unit,
  caption,
  align = 'left',
}: {
  palette: TonePalette;
  value: string;
  unit?: string;
  caption: string;
  align?: 'left' | 'center';
}) {
  return (
    <View style={align === 'center' ? styles.statCenter : undefined}>
      <Value palette={palette} value={value} unit={unit} size={19} />
      <Caption palette={palette} style={styles.statCaption}>
        {caption}
      </Caption>
    </View>
  );
}

export function ProgressBar({
  palette,
  progress,
  height = 10,
  knob = false,
  style,
}: {
  palette: TonePalette;
  progress: number;
  height?: number;
  knob?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const clamped = clamp01(progress);
  return (
    <View
      style={[
        styles.barTrack,
        { height, borderRadius: height / 2, backgroundColor: withAlpha(palette.onSurface, 0.14) },
        style,
      ]}
    >
      <View
        style={[
          styles.barFill,
          { width: `${clamped * 100}%`, borderRadius: height / 2, backgroundColor: palette.onSurface },
        ]}
      />
      {knob && (
        <View
          style={[
            styles.knob,
            {
              left: `${clamped * 100}%`,
              width: height + 8,
              height: height + 8,
              borderRadius: (height + 8) / 2,
              marginLeft: -(height + 8) / 2,
              top: -4,
              backgroundColor: palette.onSurface,
              borderColor: palette.isLightSurface ? '#FFFFFF' : '#000000',
            },
          ]}
        />
      )}
    </View>
  );
}

// A circular progress ring with rounded ends, the gap starting at twelve o'clock.
export function Ring({
  palette,
  size,
  stroke,
  progress,
  children,
}: {
  palette: TonePalette;
  size: number;
  stroke: number;
  progress: number;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const shown = clamp01(progress);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={withAlpha(palette.onSurface, 0.16)}
          strokeWidth={stroke}
          fill="none"
        />
        {shown > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={palette.onSurface}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference * shown} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      {children}
    </View>
  );
}

// Rounded vertical bars, tallest = full height. `highlight` bars are solid, the rest faded.
export function Bars({
  palette,
  values,
  width,
  height,
  gap = 4,
  highlight,
}: {
  palette: TonePalette;
  values: number[];
  width: number;
  height: number;
  gap?: number;
  highlight?: (index: number) => boolean;
}) {
  const max = Math.max(1, ...values);
  const barWidth = (width - gap * (values.length - 1)) / values.length;
  return (
    <Svg width={width} height={height}>
      {values.map((value, index) => {
        const barHeight = Math.max(barWidth, (value / max) * height);
        const solid = highlight ? highlight(index) : true;
        return (
          <Rect
            key={index}
            x={index * (barWidth + gap)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            fill={palette.onSurface}
            opacity={solid ? 1 : 0.3}
          />
        );
      })}
    </Svg>
  );
}

// A smooth line through `values` with a soft fill under it, ending in a dot.
export function Sparkline({
  palette,
  values,
  width,
  height,
}: {
  palette: TonePalette;
  values: number[];
  width: number;
  height: number;
}) {
  const gradientId = useSvgId('spark');
  const pad = 5;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => ({
    x: pad + (index / (values.length - 1)) * (width - pad * 2),
    y: pad + (1 - (value - min) / span) * (height - pad * 2),
  }));
  const line = smoothPath(points);
  const last = points[points.length - 1];
  const area = `${line} L ${last.x} ${height} L ${points[0].x} ${height} Z`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.onSurface} stopOpacity={0.28} />
          <Stop offset="1" stopColor={palette.onSurface} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${gradientId})`} />
      <Path d={line} stroke={palette.onSurface} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Circle cx={last.x} cy={last.y} r={5} fill={palette.onSurface} />
      <Circle cx={last.x} cy={last.y} r={2.2} fill={palette.isLightSurface ? '#FFFFFF' : '#000000'} />
    </Svg>
  );
}

// Catmull-Rom through the points, as cubic Béziers: a curve that passes through every value.
function smoothPath(points: { x: number; y: number }[]): string {
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

// "13450" → "13.450", as it's read in Spanish.
export function thousands(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  caption: { fontSize: 11, fontWeight: '500', letterSpacing: -0.1 },
  value: { fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  unit: { fontWeight: '500', letterSpacing: -0.2 },
  statCenter: { alignItems: 'center' },
  statCaption: { marginTop: 1 },
  barTrack: { width: '100%', overflow: 'visible' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  knob: { position: 'absolute', borderWidth: 3 },
});
