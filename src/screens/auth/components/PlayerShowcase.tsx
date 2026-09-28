import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { strings } from '@/i18n/es';
import type { MusicSource, TrackMetadata } from '@/types/music';
import { assetUri } from '@/utils/assetUri';
import type { AudioDevice } from '@/widgets/AudioDeviceIcon';
import { PLAYER_SIZE, PlayerWidget } from '@/widgets/PlayerWidget';

function previewTrack(cover: number, title: string, artist: string, source: MusicSource): TrackMetadata {
  return {
    source,
    url: 'https://open.spotify.com',
    title,
    artist,
    coverUrl: assetUri(cover),
    accentColor: null,
    durationMs: 214000,
  };
}

type Slide = { track: TrackMetadata; device: AudioDevice; startAt: number };

const SLIDES: Slide[] = [
  {
    track: previewTrack(
      require('../../../../assets/onboarding/cover-ocean.jpg'),
      strings.onboarding.previewSong2,
      strings.onboarding.previewArtist2,
      'spotify',
    ),
    device: 'airpods-pro',
    startAt: 0.42,
  },
  {
    track: previewTrack(
      require('../../../../assets/onboarding/cover-sunset.jpg'),
      strings.onboarding.previewSong,
      strings.onboarding.previewArtist,
      'youtube-music',
    ),
    device: 'airpods-max',
    startAt: 0.27,
  },
  {
    track: previewTrack(
      require('../../../../assets/onboarding/cover-stripes.jpg'),
      strings.onboarding.previewSong3,
      strings.onboarding.previewArtist3,
      'apple-music',
    ),
    device: 'homepod',
    startAt: 0.61,
  },
];

const SLIDE_MS = 2800;
const FADE_MS = 520;
const timing = { duration: FADE_MS, easing: Easing.bezier(0.22, 1, 0.36, 1) };

type Props = { active: boolean };

export function PlayerShowcase({ active }: Props) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState({ index: 0, previous: 0 });

  useEffect(() => {
    if (!active || reduceMotion) return;
    const id = setInterval(
      () => setStep(({ index }) => ({ index: (index + 1) % SLIDES.length, previous: index })),
      SLIDE_MS,
    );
    return () => clearInterval(id);
  }, [active, reduceMotion]);

  // Every slide stays mounted, stacked in a fixed order: covers and blurred backdrops are
  // decoded up front and nothing remounts or reorders on a change, so the card never shifts.
  return (
    <View style={styles.stage}>
      {SLIDES.map((slide, slideIndex) => (
        <SlideLayer key={slideIndex} slide={slide} slideIndex={slideIndex} step={step} active={active} />
      ))}
    </View>
  );
}

function SlideLayer({
  slide,
  slideIndex,
  step,
  active,
}: {
  slide: Slide;
  slideIndex: number;
  step: { index: number; previous: number };
  active: boolean;
}) {
  const opacity = useSharedValue(slideIndex === 0 ? 1 : 0);
  const { index, previous } = step;

  useEffect(() => {
    if (index === previous) return;
    // The incoming slide must never be see-through over the outgoing one. When it sits above
    // in the stack it fades in over a fully opaque card; when it sits below, it appears
    // instantly underneath and the outgoing slide fades away on top of it.
    const incomingAbove = index > previous;
    if (slideIndex === index) {
      opacity.value = incomingAbove ? withTiming(1, timing) : 1;
    } else if (slideIndex === previous) {
      opacity.value = incomingAbove
        ? withDelay(FADE_MS, withTiming(0, { duration: 0 }))
        : withTiming(0, timing);
    }
  }, [index, previous, slideIndex, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const visible = slideIndex === index;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, animatedStyle]}
      pointerEvents="none"
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
    >
      <PlayerWidget
        track={slide.track}
        tone="dark"
        outputDevice={slide.device}
        liveLevels
        playing={active && visible}
        progress={slide.startAt}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { width: PLAYER_SIZE.width, height: PLAYER_SIZE.height },
});
