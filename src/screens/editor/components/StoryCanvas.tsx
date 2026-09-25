import type { ReactNode, RefObject } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { editorColors } from '@/theme/colors';
import { STORY_ASPECT, STORY_WIDTH } from '@/theme/layout';
import type { StoryBackground } from '@/types/storyBackground';
import { StoryBackdropContext, type StoryBackdrop } from '@/widgets/glass/StoryBackdropContext';
import { useDragAndPinch } from '../hooks/useDragAndPinch';

type Props = {
  width: number;
  height: number;
  background: StoryBackground;
  backgroundRef: RefObject<View | null>;
  storyRef: RefObject<View | null>;
  resetKey: string;
  onBackgroundPress?: () => void;
  children: ReactNode;
};

export function StoryCanvas({
  width,
  height,
  background,
  backgroundRef,
  storyRef,
  resetKey,
  onBackgroundPress,
  children,
}: Props) {
  const { translation, pinchScale, panHandlers } = useDragAndPinch(resetKey);
  const canvasScale = width / STORY_WIDTH;
  const backdrop: StoryBackdrop = {
    background,
    translation,
    pinchScale,
    canvasScale,
    storyWidth: STORY_WIDTH,
    storyHeight: STORY_WIDTH * STORY_ASPECT,
  };

  return (
    <View style={[styles.clip, { width, height }]}>
      <View ref={storyRef} collapsable={false} style={StyleSheet.absoluteFill}>
        <View ref={backgroundRef} collapsable={false} style={StyleSheet.absoluteFill}>
          <BackgroundLayer background={background} />
        </View>

        <Pressable style={StyleSheet.absoluteFill} onPress={onBackgroundPress} />

        <View style={styles.center} pointerEvents="box-none">
          <Animated.View
            {...panHandlers}
            style={{
              transform: [
                { translateX: translation.x },
                { translateY: translation.y },
                { scale: Animated.multiply(pinchScale, canvasScale) },
              ],
            }}
          >
            <StoryBackdropContext value={backdrop}>{children}</StoryBackdropContext>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

function BackgroundLayer({ background }: { background: StoryBackground }) {
  if (background.kind === 'photo') {
    return (
      <Image source={{ uri: background.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    );
  }
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id="story-background" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={background.top} />
          <Stop offset="1" stopColor={background.bottom} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#story-background)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  clip: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: editorColors.canvasPlaceholder,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
