import { strings } from '@/i18n/es';
import { fetchWithTimeout } from '@/utils/http';
import type { WeatherCondition } from '@/widgets/WeatherIcon';

// Open-Meteo: free, no API key, CC BY 4.0 (credited in the widget's data sheet). Free for
// non-commercial apps; a paid Shory would move to Apple WeatherKit.
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const HOURS_SHOWN = 6;
const SUGGESTIONS = 8;

export type City = {
  id: number;
  name: string;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  latitude: number;
  longitude: number;
};

export type HourForecast = { hour: number; temp: number; condition: WeatherCondition };

export type Weather = {
  temp: number;
  condition: WeatherCondition;
  high: number;
  low: number;
  // km/h, at 10 m (what forecasts call "wind").
  wind: number;
  // The next few whole hours after now, in the city's own time.
  hours: HourForecast[];
};

type GeocodingResponse = {
  results?: {
    id: number;
    name: string;
    admin1?: string;
    country?: string;
    country_code?: string;
    feature_code?: string;
    population?: number;
    latitude: number;
    longitude: number;
  }[];
};

type ForecastResponse = {
  current: {
    time: string;
    temperature_2m: number;
    weather_code: number;
    is_day: number;
    wind_speed_10m: number;
  };
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; is_day: number[] };
  daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
};

// WMO weather interpretation codes → the widget's drawn conditions.
export function conditionFromCode(code: number, isDay: boolean): WeatherCondition {
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (code === 3) return 'cloudy';
  if (code === 1 || code === 2) return isDay ? 'partly' : 'nightPartly';
  return isDay ? 'sunny' : 'night';
}

// Autocomplete over every city in the world (GeoNames, via Open-Meteo): as the name is typed,
// populated places matching it come back biggest first, so "Are" already suggests Arequipa.
export async function searchCities(query: string): Promise<City[]> {
  const name = query.trim();
  if (name.length < 2) return [];
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(name)}&count=100&language=es&format=json`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(strings.widgets.live.failed);
  const data = (await response.json()) as GeocodingResponse;
  const seen = new Set<string>();
  const places = (data.results ?? [])
    .filter((result) => result.feature_code?.startsWith('PPL'))
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
    .filter((result) => {
      // The same town listed twice (e.g. with and without its region) shows once.
      const key = `${result.name}|${result.admin1 ?? ''}|${result.country ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, SUGGESTIONS);
  return places.map((result) => ({
    id: result.id,
    name: result.name,
    region: result.admin1 ?? null,
    country: result.country ?? null,
    countryCode: result.country_code?.toUpperCase() ?? null,
    latitude: result.latitude,
    longitude: result.longitude,
  }));
}

export async function fetchWeather(city: City): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: 'temperature_2m,weather_code,is_day,wind_speed_10m',
    wind_speed_unit: 'kmh',
    hourly: 'temperature_2m,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min',
    forecast_days: '2',
    timezone: 'auto',
  });
  const response = await fetchWithTimeout(`${FORECAST_URL}?${params}`);
  if (!response.ok) throw new Error(strings.widgets.live.failed);
  const data = (await response.json()) as ForecastResponse;

  // Times come in the city's local time ("2026-09-26T18:15"), so plain string comparison works.
  const nowHour = data.current.time.slice(0, 13);
  const start = data.hourly.time.findIndex((time) => time.slice(0, 13) > nowHour);
  const hours = (start < 0 ? [] : data.hourly.time.slice(start, start + HOURS_SHOWN)).map((time, offset) => {
    const index = start + offset;
    return {
      hour: Number(time.slice(11, 13)),
      temp: Math.round(data.hourly.temperature_2m[index]),
      condition: conditionFromCode(data.hourly.weather_code[index], data.hourly.is_day[index] === 1),
    };
  });

  return {
    temp: Math.round(data.current.temperature_2m),
    condition: conditionFromCode(data.current.weather_code, data.current.is_day === 1),
    high: Math.round(data.daily.temperature_2m_max[0]),
    low: Math.round(data.daily.temperature_2m_min[0]),
    wind: Math.round(data.current.wind_speed_10m),
    hours,
  };
}
