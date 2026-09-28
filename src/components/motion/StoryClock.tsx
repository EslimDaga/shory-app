import { createContext, use, useEffect, useImperativeHandle, useState, type ReactNode, type Ref } from 'react';

// While a video is being rendered, the exact time (seconds) of the frame being drawn. Animated
// parts read it instead of their own real-time animations, so every frame is deterministic.
const StoryClockContext = createContext<number | null>(null);

export function useStoryClock(): number | null {
  return use(StoryClockContext);
}

export type StoryClockHandle = {
  // Pins the clock to the frame being recorded; null hands it back to the preview loop.
  setTime: (seconds: number | null) => void;
};

// Provides the story clock to the editor preview. A time set through `ref` (the frame being
// recorded) wins; otherwise, when `loopSeconds` is set, it loops in real time at the export's
// frame rate, so the preview plays exactly the frames the video will contain. With neither, the
// story stands still.
export function StoryClockProvider({
  loopSeconds,
  fps,
  ref,
  children,
}: {
  loopSeconds: number | null;
  fps: number;
  ref?: Ref<StoryClockHandle>;
  children: ReactNode;
}) {
  // Held here rather than by the screen: a new time each recorded frame then re-renders only what
  // reads the clock, not the whole editor around it.
  const [time, setTime] = useState<number | null>(null);
  const [live, setLive] = useState(0);
  const running = time === null && loopSeconds !== null;

  useImperativeHandle(ref, () => ({ setTime }), []);

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    let frame = requestAnimationFrame(function tick() {
      const elapsed = ((Date.now() - start) / 1000) % loopSeconds;
      // Snapped to whole export frames: re-renders only when the recorded frame would change.
      setLive(Math.floor(elapsed * fps) / fps);
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
      setLive(0);
    };
  }, [running, loopSeconds, fps]);

  return <StoryClockContext value={time ?? (running ? live : null)}>{children}</StoryClockContext>;
}

// A smooth, never-repeating-looking bounce for equalizer bar `index` at time `t` (seconds).
export function levelAt(index: number, rest: number, t: number): number {
  const a = Math.sin(t * (5.1 + index * 0.73) + index * 1.9);
  const b = Math.sin(t * (2.3 + index * 0.41) + index * 0.7);
  const swing = (a * 0.6 + b * 0.4) * 0.42;
  return Math.min(1, Math.max(0.16, rest + swing));
}
