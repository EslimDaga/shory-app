import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useStoryClock } from '@/components/motion/StoryClock';

// Editor preview of a template's background clip: muted and looping. Video export doesn't
// capture this view; the recorder composites the original file frame by frame instead, starting
// at its first frame — so each time the preview loop restarts, the clip restarts with it.
export function BackgroundVideo({ uri }: { uri: string }) {
  const clock = useStoryClock();
  const lastClock = useRef<number | null>(null);
  const player = useVideoPlayer(uri, (created) => {
    created.loop = true;
    created.muted = true;
    created.play();
  });

  useEffect(() => {
    const previous = lastClock.current;
    lastClock.current = clock;
    if (clock !== null && previous !== null && clock < previous) player.replay();
  }, [clock, player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
    />
  );
}
