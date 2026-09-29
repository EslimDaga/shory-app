import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { withAlpha } from '@/utils/color';
import type { TonePalette } from '../tonePalette';

// Building blocks shared by the fitness widgets, drawn after the Fitness Widget Pack (Figma
// Community): a label on top, one big number with a small unit, and a single chart. Everything
// is drawn in the card's ink color at a few opacities, so each tone (glass, black, white, song
// color) reads cleanly without extra colors of its own.

export const FIT_MEDIUM = { width: 368, height: 184 };

export const FIT_RADIUS = 26;

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

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

// "13450" → "13.450", as it's read in Spanish.
export function thousands(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  caption: { fontSize: 11, fontWeight: '500', letterSpacing: -0.1 },
  value: { fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  unit: { fontWeight: '500', letterSpacing: -0.2 },
});
