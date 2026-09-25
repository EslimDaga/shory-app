import { Image, StyleSheet, Text, View } from 'react-native';
import { SourceLogo } from '@/components/SourceLogo';
import { fonts } from '@/theme/typography';
import { getTonePalette } from './tonePalette';
import type { WidgetProps } from './types';

export const POLAROID_SIZE = { width: 276, height: 336 };

export function PolaroidWidget({ track, tone }: WidgetProps) {
  const palette = getTonePalette(tone, track.accentColor);
  const frame = tone === 'light' ? '#FBF9F4' : palette.surface;

  return (
    <View style={styles.root}>
      <View style={[styles.frame, { backgroundColor: frame }]}>
        <Image source={{ uri: track.coverUrl }} style={styles.photo} />
        <View style={styles.caption}>
          <View style={styles.captionText}>
            <Text style={[styles.title, { color: palette.onSurface }]} numberOfLines={1}>
              {track.title}
            </Text>
            {track.artist ? (
              <Text style={[styles.artist, { color: palette.onSurfaceMuted }]} numberOfLines={1}>
                {track.artist}
              </Text>
            ) : null}
          </View>
          <SourceLogo source={track.source} size={20} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: POLAROID_SIZE.width,
    height: POLAROID_SIZE.height,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  frame: {
    width: 232,
    padding: 12,
    paddingBottom: 10,
    borderRadius: 3,
    transform: [{ rotate: '-4deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
  },
  photo: { width: 208, height: 208, backgroundColor: '#1a1a1a' },
  caption: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8, height: 56 },
  captionText: { flex: 1 },
  title: { fontFamily: fonts.handwritten, fontSize: 28, lineHeight: 30 },
  artist: { fontFamily: fonts.handwritten, fontSize: 19, lineHeight: 21 },
});
