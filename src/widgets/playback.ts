// Tracks without a known length play as a 3:20 song.
export const FALLBACK_DURATION_MS = 200000;

// Where the song is: the chosen progress in a photo; while a video renders, that progress
// advancing with the story clock (seconds), so every widget shows the same time on every frame.
export function playbackPosition(
  durationMs: number | null | undefined,
  progress: number,
  clock: number | null,
) {
  const duration = durationMs ?? FALLBACK_DURATION_MS;
  const shown = clock === null ? progress : Math.min(1, progress + (clock * 1000) / duration);
  const elapsedMs = duration * shown;
  return { durationMs: duration, shown, elapsedMs, remainingMs: duration - elapsedMs };
}
