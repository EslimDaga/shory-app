import type { ComponentType } from 'react';
import type { TrackMetadata } from '@/types/music';
import type { AudioDevice } from './AudioDeviceIcon';

export type WidgetTone = 'glass' | 'dark' | 'light' | 'accent';

export type WidgetData = Record<string, string>;

export type WidgetConfig = {
  tone: WidgetTone;
  device: AudioDevice | null;
  progress: number;
  showCover: boolean;
  showTimes: boolean;
  content: WidgetData;
};

export type WidgetOption = 'tone' | 'device' | 'progress' | 'cover' | 'times' | 'content';

export type WidgetCategory = 'music' | 'island' | 'fitness' | 'weather' | 'sports';

export type WidgetLiveSource = 'weather' | 'football';

export type WidgetField = {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'choice';
  choices?: { id: string; label: string }[];
  maxLength?: number;
};

export type WidgetProps = {
  track: TrackMetadata;
  tone: WidgetTone;
  outputDevice?: AudioDevice | null;
  progress?: number;
  hideCover?: boolean;
  hideTimes?: boolean;
  // What the user typed into the widget's fields; blanks fall back to the widget's defaults.
  data?: WidgetData;
};

export type WidgetDefinition = {
  id: string;
  name: string;
  category: WidgetCategory;
  options: WidgetOption[];
  fields?: WidgetField[];
  defaults?: WidgetData;
  // Where its data can be filled in from a public API, on top of typing it by hand.
  live?: WidgetLiveSource;
  // Shory Pro only.
  pro?: boolean;
  isNew?: boolean;
  width: number;
  height: number;
  Component: ComponentType<WidgetProps>;
};

export function configToProps(config: WidgetConfig) {
  return {
    tone: config.tone,
    outputDevice: config.device,
    progress: config.progress,
    hideCover: !config.showCover,
    hideTimes: !config.showTimes,
    data: config.content,
  };
}

export function readData<T extends WidgetData>(defaults: T, data: WidgetData | undefined): T {
  const merged: WidgetData = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const value = data?.[key]?.trim();
    if (value) merged[key] = value;
  }
  return merged as T;
}

export function toNumber(value: string, fallback = 0): number {
  const parsed = Number(
    value
      .replace(/[^\d.,-]/g, '')
      .replace(/[.,](?=\d{3}(\D|$))/g, '')
      .replace(',', '.'),
  );
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatThousands(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
