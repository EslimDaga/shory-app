import { useCallback, useState, type ReactNode } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

type Props = {
  uri?: string | null;
  // The white disc's diameter; the crest is drawn at `logoScale` of it.
  size: number;
  logoScale: number;
  // Shown with no crest, or when it can't be loaded, so there's never an empty white disc.
  placeholder: ReactNode;
};

// football-data.org serves many crests as SVG, which <Image> can't decode on iOS or Android.
const SVG_PATH = /\.svg($|\?)/i;

// A team crest on a white disc: official crests are drawn for light backgrounds.
export function Crest({ uri, size, logoScale, placeholder }: Props) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  // Stable per uri: SvgUri fetches again whenever its onError changes.
  const fail = useCallback(() => setFailedUri(uri ?? null), [uri]);

  if (!uri || failedUri === uri) return placeholder;

  const logo = size * logoScale;
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}>
      {Platform.OS !== 'web' && SVG_PATH.test(uri) ? (
        <SvgUri uri={uri} width={logo} height={logo} onError={fail} />
      ) : (
        <Image source={{ uri }} style={{ width: logo, height: logo }} resizeMode="contain" onError={fail} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
