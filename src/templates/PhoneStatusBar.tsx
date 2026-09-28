import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

type Props = { unit: number; color?: string };

const pad = (value: number) => String(value).padStart(2, '0');

// iOS draws the status bar in points; the templates are 1080 units wide, a 390-point phone.
const POINT = 1080 / 390;

// iOS glyph metrics (points). Signal and Wi‑Fi share one height and the battery body sits just
// above it, so the three read as one row at the same size.
const ICON_HEIGHT = 11.4;
const SIGNAL = { width: 17, bar: 3, heights: [4.2, 6.6, 9, ICON_HEIGHT] };
// The bands stop 0.3pt short of the box, room for the stroke that rounds their corners.
const WIFI = {
  width: 16,
  height: 12.2,
  bands: [
    [0, 3.3],
    [4.8, 7.6],
    [9.1, 11.6],
  ] as const,
  spread: (41 * Math.PI) / 180,
};
const BATTERY = { width: 27.3, height: 13, body: 24.5, radius: 4.2, level: 0.8 };

// A slice of a ring around the Wi‑Fi apex, from radius `inner` to `outer`, opening upwards.
function wifiBand(inner: number, outer: number): string {
  const cx = WIFI.width / 2;
  const cy = WIFI.height - 0.3;
  const sin = Math.sin(WIFI.spread);
  const cos = Math.cos(WIFI.spread);
  const at = (r: number, side: -1 | 1) => `${cx + side * r * sin} ${cy - r * cos}`;
  if (inner === 0) return `M${cx} ${cy}L${at(outer, -1)}A${outer} ${outer} 0 0 1 ${at(outer, 1)}Z`;
  return (
    `M${at(outer, -1)}A${outer} ${outer} 0 0 1 ${at(outer, 1)}` +
    `L${at(inner, 1)}A${inner} ${inner} 0 0 0 ${at(inner, -1)}Z`
  );
}

// The iOS status bar drawn at the top of the web templates: time, signal, Wi‑Fi and battery.
export function PhoneStatusBar({ unit: s, color = '#FFFFFF' }: Props) {
  const now = new Date();
  const pt = POINT * s;
  const bodyHeight = BATTERY.height - 1;
  return (
    <View style={[styles.row, { paddingVertical: 20 * s, paddingHorizontal: 65 * s }]}>
      <Text
        style={[styles.time, { color, fontSize: 48 * s }]}
      >{`${now.getHours()}:${pad(now.getMinutes())}`}</Text>
      <View style={[styles.icons, { gap: 5.5 * pt }]}>
        <Svg
          width={SIGNAL.width * pt}
          height={ICON_HEIGHT * pt}
          viewBox={`0 0 ${SIGNAL.width} ${ICON_HEIGHT}`}
        >
          {SIGNAL.heights.map((height, i) => (
            <Rect
              key={i}
              x={i * ((SIGNAL.width - SIGNAL.bar) / 3)}
              y={ICON_HEIGHT - height}
              width={SIGNAL.bar}
              height={height}
              rx={1}
              fill={color}
            />
          ))}
        </Svg>
        <Svg width={WIFI.width * pt} height={WIFI.height * pt} viewBox={`0 0 ${WIFI.width} ${WIFI.height}`}>
          {WIFI.bands.map(([inner, outer]) => (
            <Path
              key={outer}
              d={wifiBand(inner, outer)}
              fill={color}
              stroke={color}
              strokeWidth={0.6}
              strokeLinejoin="round"
            />
          ))}
        </Svg>
        <Svg
          width={BATTERY.width * pt}
          height={BATTERY.height * pt}
          viewBox={`0 0 ${BATTERY.width} ${BATTERY.height}`}
        >
          <Rect
            x={0.5}
            y={0.5}
            width={BATTERY.body}
            height={bodyHeight}
            rx={BATTERY.radius}
            stroke={color}
            strokeOpacity={0.4}
            strokeWidth={1}
            fill="none"
          />
          <Rect
            x={2.5}
            y={2.5}
            width={(BATTERY.body - 4) * BATTERY.level}
            height={bodyHeight - 4}
            rx={BATTERY.radius - 2}
            fill={color}
          />
          <Path
            d={`M${BATTERY.body + 1.5} ${BATTERY.height / 2 - 2.2}v4.4a2.3 2.3 0 0 0 0-4.4z`}
            fill={color}
            fillOpacity={0.4}
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  icons: { flexDirection: 'row', alignItems: 'center' },
});
