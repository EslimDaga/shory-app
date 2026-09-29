import { strings } from '@/i18n/es';

export type InstagramStoryPayload =
  | { backgroundImageUri: string; stickerImageUri?: string; linkUrl?: string }
  | { backgroundVideoUri: string; linkUrl?: string };

export async function shareToInstagramStories(_payload: InstagramStoryPayload): Promise<void> {
  throw new Error(strings.errors.instagramWebUnsupported);
}
