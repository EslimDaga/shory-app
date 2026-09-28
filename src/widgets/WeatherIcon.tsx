import type { ComponentType } from 'react';
import type { IconProps } from 'phosphor-react-native';
import { Cloud } from 'phosphor-react-native/src/icons/Cloud';
import { CloudFog } from 'phosphor-react-native/src/icons/CloudFog';
import { CloudLightning } from 'phosphor-react-native/src/icons/CloudLightning';
import { CloudMoon } from 'phosphor-react-native/src/icons/CloudMoon';
import { CloudRain } from 'phosphor-react-native/src/icons/CloudRain';
import { CloudSnow } from 'phosphor-react-native/src/icons/CloudSnow';
import { CloudSun } from 'phosphor-react-native/src/icons/CloudSun';
import { MoonStars } from 'phosphor-react-native/src/icons/MoonStars';
import { Sun } from 'phosphor-react-native/src/icons/Sun';

export type WeatherCondition =
  'sunny' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'storm' | 'snow' | 'night' | 'nightPartly';

const ICONS: Record<WeatherCondition, ComponentType<IconProps>> = {
  sunny: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  storm: CloudLightning,
  snow: CloudSnow,
  night: MoonStars,
  nightPartly: CloudMoon,
};

// Filled, single-color glyphs in the widget's text color, like the system weather widget.
export function WeatherIcon({
  condition,
  size,
  color,
}: {
  condition: WeatherCondition;
  size: number;
  color: string;
}) {
  const Icon = ICONS[condition] ?? Cloud;
  return <Icon size={size} color={color} weight="fill" />;
}
