import { strings } from '@/i18n/es';

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function formatTimeAgo(timestamp: number, now: number): string {
  const minutes = Math.round((now - timestamp) / 60000);
  if (minutes < 1) return strings.time.now;
  if (minutes < 60) return strings.time.minutesAgo(minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return strings.time.hoursAgo(hours);
  const days = Math.round(hours / 24);
  return days === 1 ? strings.time.yesterday : strings.time.daysAgo(days);
}
