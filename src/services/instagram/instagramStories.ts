import { Platform } from 'react-native';
import Share, { Social } from 'react-native-share';
import { strings } from '@/i18n/es';

export type InstagramStoryPayload = {
  stickerUri: string;
  backgroundImageUri?: string;
  backgroundTopColor?: string;
  backgroundBottomColor?: string;
  linkUrl?: string;
};

const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FB_APP_ID ?? '';
const INSTAGRAM_ANDROID_PACKAGE = 'com.instagram.android';
const DEFAULT_TOP_COLOR = '#121212';
const DEFAULT_BOTTOM_COLOR = '#000000';

export async function shareToInstagramStories(payload: InstagramStoryPayload): Promise<void> {
  if (!FACEBOOK_APP_ID) throw new Error(strings.errors.instagramAppIdMissing);

  if (Platform.OS === 'android') {
    const { isInstalled } = await Share.isPackageInstalled(INSTAGRAM_ANDROID_PACKAGE);
    if (!isInstalled) throw new Error(strings.errors.instagramNotInstalled);
  }

  await Share.shareSingle({
    social: Social.InstagramStories,
    appId: FACEBOOK_APP_ID,
    stickerImage: payload.stickerUri,
    backgroundImage: payload.backgroundImageUri,
    backgroundTopColor: payload.backgroundTopColor ?? DEFAULT_TOP_COLOR,
    backgroundBottomColor: payload.backgroundBottomColor ?? DEFAULT_BOTTOM_COLOR,
    attributionURL: payload.linkUrl,
    linkUrl: payload.linkUrl,
  });
}
