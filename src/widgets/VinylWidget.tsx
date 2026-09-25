import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SourceLogo } from '@/components/SourceLogo';
import { fonts } from '@/theme/typography';
import { getTonePalette } from './tonePalette';
import type { WidgetProps } from './types';

export const VINYL_SIZE = { width: 330, height: 300 };

const SLEEVE = 196;
const DISC = 190;
const LABEL = 66;
const GROOVES = [0.92, 0.84, 0.77, 0.7, 0.62, 0.55, 0.47];

export function VinylWidget({ track, tone }: WidgetProps) {
  const palette = getTonePalette(tone, track.accentColor);
  const textColor = tone === 'light' ? '#141414' : '#FFFFFF';
  const shadow = tone === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)';

  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        <View style={styles.disc}>
          <Svg width={DISC} height={DISC} viewBox="0 0 100 100">
            <Defs>
              <LinearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
                <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset="0.7" stopColor="#FFFFFF" stopOpacity={0.08} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Circle cx={50} cy={50} r={50} fill="#0B0B0B" />
            {GROOVES.map((r) => (
              <Circle key={r} cx={50} cy={50} r={50 * r} fill="none" stroke="#FFFFFF" strokeOpacity={0.07} strokeWidth={0.5} />
            ))}
            <Circle cx={50} cy={50} r={50} fill="url(#sheen)" />
          </Svg>
          <Image source={{ uri: track.coverUrl }} style={styles.label} />
          <View style={styles.spindle} />
        </View>

        <View style={styles.sleeve}>
          <Image source={{ uri: track.coverUrl }} style={styles.sleeveImage} />
          <View style={styles.badge}>
            <SourceLogo source={track.source} size={22} />
          </View>
        </View>
      </View>

      <Text
        style={[styles.title, { color: textColor, textShadowColor: shadow }]}
        numberOfLines={1}
      >
        {track.title}
      </Text>
      {track.artist ? (
        <Text
          style={[
            styles.artist,
            { color: tone === 'accent' ? palette.surface : textColor, textShadowColor: shadow },
          ]}
          numberOfLines={1}
        >
          {track.artist.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: VINYL_SIZE.width,
    height: VINYL_SIZE.height,
    paddingHorizontal: 14,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  stage: { height: SLEEVE + 8, justifyContent: 'center' },
  disc: {
    position: 'absolute',
    left: SLEEVE - DISC / 2 + 8,
    width: DISC,
    height: DISC,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    width: LABEL,
    height: LABEL,
    borderRadius: LABEL / 2,
  },
  spindle: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0B0B0B',
  },
  sleeve: {
    width: SLEEVE,
    height: SLEEVE,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 4, height: 6 },
  },
  sleeveImage: { width: SLEEVE, height: SLEEVE, borderRadius: 4, backgroundColor: '#1a1a1a' },
  badge: { position: 'absolute', left: 8, bottom: 8 },
  title: {
    fontFamily: fonts.displayItalic,
    fontSize: 34,
    letterSpacing: -0.5,
    marginTop: 10,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 1 },
  },
  artist: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2.2,
    marginTop: 2,
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
});
