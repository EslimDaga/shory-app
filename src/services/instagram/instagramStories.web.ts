import { strings } from '@/i18n/es';

export type InstagramStoryPayload = {
  stickerUri: string;
  backgroundImageUri?: string;
  backgroundTopColor?: string;
  backgroundBottomColor?: string;
  linkUrl?: string;
};

export async function shareToInstagramStories(_payload: InstagramStoryPayload): Promise<void> {
  throw new Error(strings.errors.instagramWebUnsupported);
}
