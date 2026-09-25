import { strings } from '@/i18n/es';

export type InstagramStoryPayload = {
  /** Full 9:16 story, widget already composited at the position chosen in the editor. */
  storyImageUri: string;
  linkUrl?: string;
};

export async function shareToInstagramStories(_payload: InstagramStoryPayload): Promise<void> {
  throw new Error(strings.errors.instagramWebUnsupported);
}
