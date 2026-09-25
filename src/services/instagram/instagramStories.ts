import { Platform } from 'react-native';
import Share, { Social } from 'react-native-share';
import { strings } from '@/i18n/es';

export type InstagramStoryPayload = {
  /** Full 9:16 story, widget already composited at the position chosen in the editor. */
  storyImageUri: string;
  linkUrl?: string;
};

const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FB_APP_ID ?? '';
const INSTAGRAM_ANDROID_PACKAGE = 'com.instagram.android';

export async function shareToInstagramStories(payload: InstagramStoryPayload): Promise<void> {
  if (!FACEBOOK_APP_ID) throw new Error(strings.errors.instagramAppIdMissing);

  if (Platform.OS === 'android') {
    const { isInstalled } = await Share.isPackageInstalled(INSTAGRAM_ANDROID_PACKAGE);
    if (!isInstalled) throw new Error(strings.errors.instagramNotInstalled);
  }

  await Share.shareSingle({
    social: Social.InstagramStories,
    appId: FACEBOOK_APP_ID,
    // Sent as the background rather than a sticker: the Stories API has no way to place a
    // sticker, so Instagram would always drop it in the center.
    backgroundImage: payload.storyImageUri,
    attributionURL: payload.linkUrl,
    linkUrl: payload.linkUrl,
  });
}
