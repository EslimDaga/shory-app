import { Image, StyleSheet, Text, View } from 'react-native';
import { FastForward } from 'phosphor-react-native/src/icons/FastForward';
import { Heart } from 'phosphor-react-native/src/icons/Heart';
import { ListBullets } from 'phosphor-react-native/src/icons/ListBullets';
import { Pause } from 'phosphor-react-native/src/icons/Pause';
import { Quotes } from 'phosphor-react-native/src/icons/Quotes';
import { Rewind } from 'phosphor-react-native/src/icons/Rewind';
import { SpeakerHigh } from 'phosphor-react-native/src/icons/SpeakerHigh';
import { SpeakerNone } from 'phosphor-react-native/src/icons/SpeakerNone';
import { FALLBACK_ACCENT } from '@/constants/storyBackgrounds';
import { AudioDeviceIcon, BluetoothOutputIcon } from '@/widgets/AudioDeviceIcon';
import { PhoneStatusBar } from './PhoneStatusBar';
import { formatClip, heartScaleAt, marqueeOffset, TEMPLATE_SECONDS, useTemplateTime } from './templateClock';
import type { TemplateProps } from './types';

const HEART = '#EF4444';
const MUTED = 'rgba(255, 255, 255, 0.53)';
const VOLUME = 0.7;

// A port of the web app's Remotion "Apple-Music" composition, in its 1080-wide pixels times `s`.
export function AppleMusicTemplate({ track, background, width, height, device }: TemplateProps) {
  const s = width / 1080;
  const t = useTemplateTime();
  const progress = Math.min(1, t / TEMPLATE_SECONDS);
  // The chosen background color leads; a photo background falls back to the song's accent.
  const tint = background.kind === 'gradient' ? background.top : (track.accentColor ?? FALLBACK_ACCENT);
  // A photo or a video shows through under a darker shade; a video plays behind the template
  // (in the editor, and composited by the recorder), so the template leaves it uncovered.
  const media = background.kind !== 'gradient';

  return (
    <View
      style={[
        styles.root,
        {
          width,
          height,
          backgroundColor: media ? 'transparent' : tint,
          paddingVertical: 16 * s,
          paddingHorizontal: 32 * s,
        },
      ]}
    >
      {background.kind === 'photo' && (
        <Image source={{ uri: background.uri }} style={styles.bleed} resizeMode="cover" />
      )}
      <View style={[styles.bleed, media ? styles.photoShade : styles.shade]} />
      <PhoneStatusBar unit={s} />

      <View
        style={[styles.grabber, { width: 100 * s, height: 14 * s, borderRadius: 7 * s, marginTop: 30 * s }]}
      />

      <View style={[styles.center, { paddingTop: 100 * s }]}>
        <Image
          source={{ uri: track.coverUrl }}
          style={{ width: 700 * s, height: 700 * s, borderRadius: 40 * s }}
          resizeMode="cover"
        />
      </View>

      <View style={[styles.row, { paddingTop: 160 * s, paddingHorizontal: 30 * s, gap: 62 * s }]}>
        <View style={styles.titles}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              { fontSize: 50 * s, transform: [{ translateX: -marqueeOffset(track.title, t, s) }] },
            ]}
          >
            {track.title}
          </Text>
          <Text numberOfLines={1} style={[styles.artist, { fontSize: 40 * s }]}>
            {track.artist}
          </Text>
        </View>
        <View style={{ transform: [{ scale: heartScaleAt(t) }] }}>
          <Heart size={80 * s} color={HEART} weight="fill" />
        </View>
      </View>

      <View style={{ paddingVertical: 30 * s, paddingHorizontal: 30 * s, gap: 15 * s }}>
        <View style={[styles.bar, { height: 20 * s, borderRadius: 10 * s }]}>
          <View style={[styles.fill, { width: `${progress * 100}%`, borderRadius: 10 * s }]} />
        </View>
        <View style={styles.row}>
          <Text style={[styles.time, { fontSize: 30 * s }]}>{formatClip(t)}</Text>
          <Text style={[styles.time, { fontSize: 30 * s }]}>-{formatClip(TEMPLATE_SECONDS - t)}</Text>
        </View>
      </View>

      <View style={[styles.transport, { paddingVertical: 30 * s, gap: 150 * s }]}>
        <Rewind size={90 * s} color="#FFFFFF" weight="fill" />
        <Pause size={130 * s} color="#FFFFFF" weight="fill" />
        <FastForward size={90 * s} color="#FFFFFF" weight="fill" />
      </View>

      <View style={[styles.row, { paddingHorizontal: 30 * s, gap: 50 * s }]}>
        <SpeakerNone size={50 * s} color={MUTED} weight="fill" />
        <View style={[styles.bar, styles.flex, { height: 20 * s, borderRadius: 10 * s }]}>
          <View style={[styles.fill, { width: `${VOLUME * 100}%`, borderRadius: 10 * s }]} />
        </View>
        <SpeakerHigh size={70 * s} color={MUTED} weight="fill" />
      </View>

      <View style={[styles.row, { paddingTop: 60 * s, paddingHorizontal: 120 * s }]}>
        <Quotes size={70 * s} color="#FFFFFF" weight="fill" />
        {device ? (
          <AudioDeviceIcon device={device} color="#FFFFFF" size={70 * s} />
        ) : (
          <BluetoothOutputIcon color="#FFFFFF" size={70 * s} />
        )}
        <ListBullets size={60 * s} color="#FFFFFF" weight="bold" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  // A pixel past every edge, so nothing behind the template shows along a fractional edge.
  bleed: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1 },
  shade: { backgroundColor: 'rgba(0, 0, 0, 0.2)' },
  // A photo needs more darkening than a flat color to keep the white controls readable.
  photoShade: { backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  grabber: { alignSelf: 'center', backgroundColor: MUTED },
  center: { alignItems: 'center' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titles: { flex: 1, overflow: 'hidden' },
  title: { color: '#FFFFFF', fontWeight: '700' },
  artist: { color: 'rgba(255, 255, 255, 0.87)', fontWeight: '500', marginTop: 4 },
  bar: { backgroundColor: MUTED, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#FFFFFF' },
  time: { color: MUTED, fontVariant: ['tabular-nums'], fontWeight: '600' },
  transport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
