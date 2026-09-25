import { useLayoutEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { StoryBackground } from '@/types/storyBackground';
import { useStoryBackdrop, type StoryBackdrop } from './StoryBackdropContext';

type Props = {
  widgetWidth: number;
  widgetHeight: number;
  inset: number;
  fallbackImageUri: string;
};

const BACKDROP_BLUR = 22;
const FALLBACK_BLUR = 30;
// Upper bound on how long a widget stays hidden waiting for its blurred backdrop.
const REVEAL_TIMEOUT_MS = 700;

export function LiquidGlass({ widgetWidth, widgetHeight, inset, fallbackImageUri }: Props) {
  const backdrop = useStoryBackdrop();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {backdrop ? (
        <BackdropSlice
          backdrop={backdrop}
          widgetWidth={widgetWidth}
          widgetHeight={widgetHeight}
          inset={inset}
        />
      ) : (
        <Image
          source={{ uri: fallbackImageUri }}
          style={styles.fallback}
          blurRadius={FALLBACK_BLUR}
        />
      )}
      <View style={styles.tint} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="glass-sheen" x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.34} />
            <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.06} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glass-sheen)" />
      </Svg>
    </View>
  );
}

function BackdropSlice({
  backdrop,
  widgetWidth,
  widgetHeight,
  inset,
}: {
  backdrop: StoryBackdrop;
  widgetWidth: number;
  widgetHeight: number;
  inset: number;
}) {
  const { translation, pinchScale, canvasScale, storyWidth, storyHeight } = backdrop;
  const inverseScale = Animated.divide(1, pinchScale);
  const offsetX = Animated.divide(Animated.multiply(translation.x, -1 / canvasScale), pinchScale);
  const offsetY = Animated.divide(Animated.multiply(translation.y, -1 / canvasScale), pinchScale);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: widgetWidth / 2 - inset - storyWidth / 2,
        top: widgetHeight / 2 - inset - storyHeight / 2,
        width: storyWidth,
        height: storyHeight,
        transform: [{ translateX: offsetX }, { translateY: offsetY }, { scale: inverseScale }],
      }}
    >
      <BackgroundFill background={backdrop.background} holdReveal={backdrop.holdReveal} />
    </Animated.View>
  );
}

function BackgroundFill({
  background,
  holdReveal,
}: {
  background: StoryBackground;
  holdReveal: StoryBackdrop['holdReveal'];
}) {
  const photoUri = background.kind === 'photo' ? background.uri : null;
  const releaseRef = useRef<(() => void) | null>(null);

  // Runs before paint: the widget stays hidden until the blurred photo is decoded,
  // instead of flashing an empty glass card that fills in a moment later.
  useLayoutEffect(() => {
    if (!photoUri) return;
    const release = holdReveal();
    releaseRef.current = release;
    const timeout = setTimeout(release, REVEAL_TIMEOUT_MS);
    return () => {
      clearTimeout(timeout);
      release();
    };
  }, [photoUri, holdReveal]);

  const onSettled = () => releaseRef.current?.();

  if (background.kind === 'photo') {
    return (
      <Image
        source={{ uri: background.uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        blurRadius={BACKDROP_BLUR}
        fadeDuration={0}
        onLoad={onSettled}
        onError={onSettled}
      />
    );
  }
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id="glass-backdrop" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={background.top} />
          <Stop offset="1" stopColor={background.bottom} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#glass-backdrop)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFill,
    transform: [{ scale: 1.25 }],
  },
  tint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(18, 18, 20, 0.24)',
  },
});
