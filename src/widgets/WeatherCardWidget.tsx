import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Wind } from 'phosphor-react-native/src/icons/Wind';
import { strings } from '@/i18n/es';
import { getTonePalette } from './tonePalette';
import { readData, toNumber, type WidgetProps } from './types';
import type { WeatherCondition } from './WeatherIcon';
import { WidgetSurface } from './WidgetSurface';

export const WEATHER_CARD_SIZE = { width: 236, height: 236 };

export const WEATHER_CARD_DEFAULTS = {
  city: 'Lima',
  temp: '20',
  condition: 'cloudy',
  wind: '5',
};

// Filled in with the city by a search ("PE"); typing a city by hand clears it.
export const COUNTRY_KEY = 'country';

// 3D weather art ("48 Weather Icons", Figma Community), one per sky the widget knows.
const ART: Record<WeatherCondition, ImageSourcePropType> = {
  sunny: require('../../assets/weather/sunny.png'),
  partly: require('../../assets/weather/partly.png'),
  cloudy: require('../../assets/weather/cloudy.png'),
  fog: require('../../assets/weather/fog.png'),
  rain: require('../../assets/weather/rain.png'),
  storm: require('../../assets/weather/storm.png'),
  snow: require('../../assets/weather/snow.png'),
  night: require('../../assets/weather/night.png'),
  nightPartly: require('../../assets/weather/nightPartly.png'),
};

// A square card with the sky drawn big: the art bleeds off the right edge, under the numbers.
export function WeatherCardWidget({ track, tone, data }: WidgetProps) {
  const palette = getTonePalette(tone, track.accentColor);
  const values = readData(WEATHER_CARD_DEFAULTS, data);
  const condition = (values.condition in ART ? values.condition : 'cloudy') as WeatherCondition;
  const temp = Math.round(toNumber(values.temp, 20));
  const wind = Math.round(toNumber(values.wind, 0));
  const country = data?.[COUNTRY_KEY]?.trim();
  const ink = { color: palette.onSurface };

  return (
    <WidgetSurface track={track} tone={tone} {...WEATHER_CARD_SIZE} radius={28} style={styles.card}>
      <Image source={ART[condition]} style={styles.art} resizeMode="contain" />

      <View>
        <Text style={[styles.city, ink]} numberOfLines={1}>
          {country ? `${values.city}, ${country}` : values.city}
        </Text>
        <Text style={[styles.temp, ink]}>{temp}°C</Text>
      </View>

      <View style={styles.bottom}>
        <Text style={[styles.condition, ink]} numberOfLines={1}>
          {strings.widgets.weather.conditions[condition]}
        </Text>
        <View style={styles.wind}>
          <Wind size={18} color={palette.onSurface} weight="bold" />
          <Text style={[styles.windText, ink]}>{strings.widgets.weatherCard.wind(wind)}</Text>
        </View>
      </View>
    </WidgetSurface>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18, justifyContent: 'space-between' },
  art: { position: 'absolute', width: 150, height: 150, right: -34, top: 40 },
  city: { fontSize: 17, fontWeight: '500', letterSpacing: -0.4, maxWidth: 180 },
  temp: { fontSize: 44, fontWeight: '600', letterSpacing: -1.6, lineHeight: 50, marginTop: 6 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  condition: { flexShrink: 1, fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  wind: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  windText: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
});
