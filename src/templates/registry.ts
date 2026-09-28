import { strings } from '@/i18n/es';
import { AppleMusicTemplate } from './AppleMusicTemplate';
import { SpotifyPhotoTemplate, SpotifyTemplate } from './SpotifyTemplate';
import type { AudioDevice } from '@/widgets/AudioDeviceIcon';
import type { TemplateDefinition } from './types';

// What a template shows until its own sheet says otherwise.
export const DEFAULT_TEMPLATE_DEVICE: AudioDevice = 'airpods-pro';

export const TEMPLATES: TemplateDefinition[] = [
  { id: 'spotify', name: strings.templates.spotify, Component: SpotifyTemplate },
  { id: 'spotify-photo', name: strings.templates.spotifyPhoto, pro: true, Component: SpotifyPhotoTemplate },
  { id: 'apple-music', name: strings.templates.appleMusic, pro: true, Component: AppleMusicTemplate },
];
