import { useStoryClock } from '@/components/motion/StoryClock';

// Templates are recorded as 15-second clips, like the web version.
export const TEMPLATE_SECONDS = 15;

// Seconds into the clip, from the story clock: the frame being recorded, the video preview's
// loop, or 0 when the story stands still (photo mode, thumbnails).
export function useTemplateTime(): number {
  return useStoryClock() ?? 0;
}

export function formatClip(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

// The web templates' heart: eight gentle pulses over the clip.
export function heartScaleAt(seconds: number): number {
  return 1 + Math.sin((seconds / TEMPLATE_SECONDS) * 16 * Math.PI) * 0.2;
}

// Long titles scroll sideways like Spotify's marquee; short ones stay put.
export function marqueeOffset(title: string, seconds: number, unit: number): number {
  if (title.length <= 24) return 0;
  const span = title.length * 10 * unit;
  return (seconds * 60 * unit) % span;
}
