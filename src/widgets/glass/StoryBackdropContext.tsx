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
  /** Keeps the widget hidden until the returned release callback runs, so it never paints half-built. */
  holdReveal: () => () => void;
};

export const StoryBackdropContext = createContext<StoryBackdrop | null>(null);

export function useStoryBackdrop(): StoryBackdrop | null {
  return useContext(StoryBackdropContext);
}
