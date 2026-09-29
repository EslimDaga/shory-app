import type { ComponentType } from 'react';
import type { StoryBackground } from '@/types/storyBackground';
import type { TrackMetadata } from '@/types/music';
import type { AudioDevice } from '@/widgets/AudioDeviceIcon';

export type TemplateProps = {
  track: TrackMetadata;
  background: StoryBackground;
  width: number;
  height: number;
  userName: string;
  // null is a plain Bluetooth output.
  device: AudioDevice | null;
};

export type TemplateDefinition = {
  id: string;
  name: string;
  // Shory Pro only.
  pro?: boolean;
  Component: ComponentType<TemplateProps>;
};

// What the user can change on a template. The music (cover, title, artist) starts from the
// shared track and the owner from the signed-in user, but every field can be overridden. Each
// template keeps its own copy, edited in its own sheet.
export type TemplateContent = {
  title: string;
  artist: string;
  coverUri: string;
  owner: string;
  device: AudioDevice | null;
};
