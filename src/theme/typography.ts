import { BricolageGrotesque_500Medium } from '@expo-google-fonts/bricolage-grotesque/500Medium';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';

export const fontAssets = {
  GeistMono_500Medium,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
};

export const fonts = {
  mono: 'GeistMono_500Medium',
  sansMedium: 'BricolageGrotesque_500Medium',
  sansSemiBold: 'BricolageGrotesque_600SemiBold',
  sansExtraBold: 'BricolageGrotesque_800ExtraBold',
} as const;
