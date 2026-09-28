import { StyleSheet, Text, View } from 'react-native';
import { NavigationArrow } from 'phosphor-react-native/src/icons/NavigationArrow';
import { strings } from '@/i18n/es';
import { getTonePalette } from './tonePalette';
import { readData, toNumber, type WidgetProps } from './types';
import { WeatherIcon, type WeatherCondition } from './WeatherIcon';
import { WidgetSurface } from './WidgetSurface';

export const WEATHER_SIZE = { width: 352, height: 200 };

export const WEATHER_DEFAULTS = {
  city: 'Lima',
  temp: '22',
  condition: 'night',
  high: '26',
  low: '17',
};

// Real hourly forecast, filled in from a city search: "19:21:night,20:20:nightPartly,…"
// (hour:temp:sky). Without it the widget estimates the next hours from the current temperature.
export const HOURLY_KEY = 'hourly';

const HOURS_SHOWN = 6;
const ESTIMATED_DELTAS = [-1, -1, -2, -3, -3, -3];

type Hour = { hour: number; temp: number; condition: WeatherCondition };

function parseHourly(value: string | undefined): Hour[] | null {
  if (!value) return null;
  const hours = value.split(',').map((entry) => {
    const [hour, temp, condition] = entry.split(':');
    return { hour: Number(hour), temp: Number(temp), condition: condition as WeatherCondition };
  });
  return hours.every((entry) => Number.isFinite(entry.hour) && Number.isFinite(entry.temp)) ? hours : null;
}

// "7 PM", "12 AM": short enough for six columns.
function hourLabel(hour: number): string {
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function WeatherWidget({ track, tone, data }: WidgetProps) {
  const palette = getTonePalette(tone, track.accentColor);
  const values = readData(WEATHER_DEFAULTS, data);
  const condition = values.condition as WeatherCondition;
  const temp = Math.round(toNumber(values.temp, 22));
  const now = new Date().getHours();
  const hours: Hour[] =
    parseHourly(data?.[HOURLY_KEY])?.slice(0, HOURS_SHOWN) ??
    ESTIMATED_DELTAS.map((delta, index) => ({ hour: (now + index + 1) % 24, temp: temp + delta, condition }));

  return (
    <WidgetSurface track={track} tone={tone} {...WEATHER_SIZE} style={styles.card}>
      <View style={styles.top}>
        <View>
          <View style={styles.cityRow}>
            <Text style={[styles.city, { color: palette.onSurface }]} numberOfLines={1}>
              {values.city}
            </Text>
            <NavigationArrow size={13} color={palette.onSurface} weight="fill" style={styles.arrow} />
          </View>
          <Text style={[styles.temp, { color: palette.onSurface }]}>{temp}°</Text>
        </View>

        <View style={styles.summary}>
          <WeatherIcon condition={condition} size={22} color={palette.onSurface} />
          <View style={styles.summaryText}>
            <Text style={[styles.condition, { color: palette.onSurface }]} numberOfLines={1}>
              {strings.widgets.weather.conditions[condition]}
            </Text>
            <Text style={[styles.range, { color: palette.onSurface }]}>
              {strings.widgets.weather.range(values.high, values.low)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.hours}>
        {hours.map((entry, index) => (
          <View key={index} style={styles.hour}>
            <Text style={[styles.hourLabel, { color: palette.onSurfaceMuted }]}>{hourLabel(entry.hour)}</Text>
            <WeatherIcon condition={entry.condition} size={20} color={palette.onSurface} />
            <Text style={[styles.hourTemp, { color: palette.onSurface }]}>{entry.temp}°</Text>
          </View>
        ))}
      </View>
    </WidgetSurface>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  city: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3, maxWidth: 170 },
  arrow: { transform: [{ rotate: '90deg' }] },
  temp: { fontSize: 48, fontWeight: '300', letterSpacing: -1.5, lineHeight: 54, marginLeft: -2 },
  summary: { alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 2, paddingBottom: 6 },
  summaryText: { alignItems: 'flex-end' },
  condition: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2, maxWidth: 150 },
  range: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  hours: { flexDirection: 'row', justifyContent: 'space-between' },
  hour: { width: 46, alignItems: 'center', gap: 6 },
  hourLabel: { fontSize: 11, fontWeight: '600', letterSpacing: -0.1, fontVariant: ['tabular-nums'] },
  hourTemp: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
