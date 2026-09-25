import type { ComponentType } from 'react';
import type { TrackMetadata } from '@/types/music';

export type WidgetTone = 'glass' | 'dark' | 'light' | 'accent';

export type WidgetProps = {
  track: TrackMetadata;
  tone: WidgetTone;
};

export type WidgetDefinition = {
  id: string;
  name: string;
  width: number;
  height: number;
  Component: ComponentType<WidgetProps>;
};
