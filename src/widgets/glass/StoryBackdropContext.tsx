import { createContext, useContext } from 'react';
import type { Animated } from 'react-native';
import type { StoryBackground } from '@/types/storyBackground';

export type StoryBackdrop = {
  background: StoryBackground;
  translation: Animated.ValueXY;
  pinchScale: Animated.Value;
  canvasScale: number;
  storyWidth: number;
  storyHeight: number;
  holdReveal: () => () => void;
  // Exporting a movable Instagram sticker: a baked background slice would stop matching once the
  // sticker moves, so glass renders truly translucent and blends with whatever ends up behind it.
  adaptive?: boolean;
};

export const StoryBackdropContext = createContext<StoryBackdrop | null>(null);

export function useStoryBackdrop(): StoryBackdrop | null {
  return useContext(StoryBackdropContext);
}
