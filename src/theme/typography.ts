import { Caveat_600SemiBold } from '@expo-google-fonts/caveat/600SemiBold';
import { BricolageGrotesque_500Medium } from '@expo-google-fonts/bricolage-grotesque/500Medium';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';

export const fontAssets = {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
  GeistMono_400Regular,
  GeistMono_500Medium,
  Caveat_600SemiBold,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
};

export const fonts = {
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
  mono: 'GeistMono_500Medium',
  monoRegular: 'GeistMono_400Regular',
  handwritten: 'Caveat_600SemiBold',
  sansMedium: 'BricolageGrotesque_500Medium',
  sansSemiBold: 'BricolageGrotesque_600SemiBold',
  sansExtraBold: 'BricolageGrotesque_800ExtraBold',
} as const;
