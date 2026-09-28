import { Image, StyleSheet, Text, View } from 'react-native';
import { CaretDown } from 'phosphor-react-native/src/icons/CaretDown';
import { DotsThree } from 'phosphor-react-native/src/icons/DotsThree';
import { Export } from 'phosphor-react-native/src/icons/Export';
import { Heart } from 'phosphor-react-native/src/icons/Heart';
import { PauseCircle } from 'phosphor-react-native/src/icons/PauseCircle';
import { Repeat } from 'phosphor-react-native/src/icons/Repeat';
import { Shuffle } from 'phosphor-react-native/src/icons/Shuffle';
import { SkipBack } from 'phosphor-react-native/src/icons/SkipBack';
import { SkipForward } from 'phosphor-react-native/src/icons/SkipForward';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { FALLBACK_ACCENT } from '@/constants/storyBackgrounds';
import { strings } from '@/i18n/es';
import { AUDIO_DEVICES, AudioDeviceIcon, BluetoothOutputIcon } from '@/widgets/AudioDeviceIcon';
import { PhoneStatusBar } from './PhoneStatusBar';
import { formatClip, heartScaleAt, marqueeOffset, TEMPLATE_SECONDS, useTemplateTime } from './templateClock';
import type { TemplateProps } from './types';

const GREEN = '#1ED760';
const HEART = '#EF4444';
const MUTED = 'rgba(255, 255, 255, 0.53)';

// A 1:1 port of the web app's Remotion "Spotify" composition. Every size is in the original's
// 1080-wide pixels times `s`, so the layout matches at any canvas size and stays sharp in 4K.
export function SpotifyTemplate(props: TemplateProps) {
  return <SpotifyPlayer {...props} variant="cover" />;
}

// "Spotify-Background": the story's own photo behind a dark veil, no artwork.
export function SpotifyPhotoTemplate(props: TemplateProps) {
  return <SpotifyPlayer {...props} variant="photo" />;
}

function SpotifyPlayer({
  track,
  background,
  width,
  height,
  userName,
  device,
  variant,
}: TemplateProps & { variant: 'cover' | 'photo' }) {
  const s = width / 1080;
  const t = useTemplateTime();
  const progress = Math.min(1, t / TEMPLATE_SECONDS);
  // The chosen background color leads; a photo background falls back to the song's accent.
  const tint = background.kind === 'gradient' ? background.top : (track.accentColor ?? FALLBACK_ACCENT);
  // A photo or a video shows through; a video plays behind the template, so nothing is drawn for it.
  const photo = background.kind !== 'gradient';
  const deviceName = device
    ? (AUDIO_DEVICES.find((item) => item.id === device)?.name ?? device)
    : strings.editor.deviceBluetooth;

  return (
    <View style={[styles.root, { width, height, paddingVertical: 16 * s, paddingHorizontal: 32 * s }]}>
      {variant === 'cover' ? (
        <>
          {/* The media background shows through, darkened towards the controls like the tint fade. */}
          {background.kind === 'photo' && (
            <Image source={{ uri: background.uri }} style={styles.bleed} resizeMode="cover" />
          )}
          <Svg style={styles.bleed} width={width + 2} height={height + 2}>
            <Defs>
              <LinearGradient id="spotify-fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={photo ? '#000000' : tint} stopOpacity={photo ? 0.25 : 1} />
                <Stop offset="1" stopColor="#000000" stopOpacity={photo ? 0.9 : 1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#spotify-fade)" />
          </Svg>
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.veil]} />
      )}

      <PhoneStatusBar unit={s} />

      <View style={[styles.row, { paddingVertical: 60 * s, paddingHorizontal: 30 * s }]}>
        <CaretDown size={50 * s} color="#FFFFFF" weight="bold" />
        <Text style={[styles.playingFrom, { fontSize: 30 * s, letterSpacing: 5 * s }]}>
          {strings.templates.playingFrom}
        </Text>
        <DotsThree size={50 * s} color="#FFFFFF" weight="bold" />
      </View>

      {variant === 'cover' ? (
        <View style={{ paddingVertical: 20 * s, paddingHorizontal: 90 * s, height: 900 * s }}>
          <Image
            source={{ uri: track.coverUrl }}
            style={[styles.cover, { borderRadius: 40 * s }]}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View style={{ height: 860 * s }} />
      )}

      <View style={[styles.row, { paddingVertical: 40 * s, paddingHorizontal: 30 * s, gap: 62 * s }]}>
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

      <View style={{ paddingVertical: 30 * s, paddingHorizontal: 30 * s, gap: 12 * s }}>
        <View style={[styles.track, { height: 10 * s, borderRadius: 10 * s }]}>
          <View style={[styles.fill, { width: `${progress * 100}%`, borderRadius: 10 * s }]} />
          <View
            style={[
              styles.knob,
              {
                width: 30 * s,
                height: 30 * s,
                borderRadius: 15 * s,
                top: -10 * s,
                left: `${progress * 100}%`,
                marginLeft: -15 * s,
              },
            ]}
          />
        </View>
        <View style={[styles.row, { marginTop: 12 * s }]}>
          <Text style={[styles.time, { fontSize: 30 * s }]}>{formatClip(t)}</Text>
          <Text style={[styles.time, { fontSize: 30 * s }]}>{formatClip(TEMPLATE_SECONDS)}</Text>
        </View>
      </View>

      <View style={[styles.row, { paddingVertical: 30 * s, paddingHorizontal: 30 * s }]}>
        <Shuffle size={70 * s} color={GREEN} weight="bold" />
        <View style={[styles.transport, { gap: 110 * s }]}>
          <SkipBack size={90 * s} color="#FFFFFF" weight="fill" />
          <PauseCircle size={170 * s} color="#FFFFFF" weight="fill" />
          <SkipForward size={90 * s} color="#FFFFFF" weight="fill" />
        </View>
        <Repeat size={70 * s} color={MUTED} weight="bold" />
      </View>

      <View style={[styles.row, { paddingVertical: 45 * s, paddingHorizontal: 30 * s }]}>
        <View style={[styles.device, { gap: 15 * s }]}>
          {device ? (
            <AudioDeviceIcon device={device} color={GREEN} size={50 * s} />
          ) : (
            <BluetoothOutputIcon color={GREEN} size={50 * s} />
          )}
          <Text style={[styles.deviceText, { fontSize: 40 * s }]} numberOfLines={1}>
            {strings.templates.deviceOf(deviceName, userName)}
          </Text>
        </View>
        <Export size={58 * s} color="#FFFFFF" weight="regular" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  // A pixel past every edge: at a fractional canvas width the story background would otherwise
  // show through as a thin line along the right edge once scaled up to 4K. The Svg gets explicit
  // pixel sizes: a "100%" would resolve against the root's padded content box and leave the
  // right and bottom edges uncovered.
  bleed: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1 },
  veil: { backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playingFrom: { color: MUTED, fontWeight: '500' },
  cover: { width: '100%', height: '100%' },
  titles: { flex: 1, overflow: 'hidden' },
  title: { color: '#FFFFFF', fontWeight: '700' },
  artist: { color: MUTED, fontWeight: '500', marginTop: 4 },
  track: { width: '100%', backgroundColor: MUTED },
  fill: { height: '100%', backgroundColor: '#FFFFFF' },
  knob: { position: 'absolute', backgroundColor: '#FFFFFF' },
  time: { color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  transport: { flexDirection: 'row', alignItems: 'center' },
  device: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  deviceText: { color: GREEN, fontWeight: '500', flexShrink: 1 },
});
