import { Linking, Platform } from 'react-native';
import Share, { Social } from 'react-native-share';
import { strings } from '@/i18n/es';

export type InstagramStoryPayload =
  | { backgroundImageUri: string; stickerImageUri?: string; linkUrl?: string }
  | { backgroundVideoUri: string; linkUrl?: string };

const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FB_APP_ID ?? '';
const INSTAGRAM_ANDROID_PACKAGE = 'com.instagram.android';
// Declared in LSApplicationQueriesSchemes (react-native-share plugin in app.json), so iOS answers.
const INSTAGRAM_STORIES_URL = 'instagram-stories://share';

// Instagram's own story camera. Stories started there can carry a song (the Music sticker);
// stories handed over by another app can't — Instagram blocks music on those.
const STORY_CAMERA_URLS = ['instagram://story-camera', 'instagram://camera', 'instagram://app'];

export async function openInstagramStoryCamera(): Promise<void> {
  for (const url of STORY_CAMERA_URLS) {
    try {
      await Linking.openURL(url);
      return;
    } catch {}
  }
  throw new Error(strings.errors.instagramNotInstalled);
}

export async function shareToInstagramStories(payload: InstagramStoryPayload): Promise<void> {
  if (!FACEBOOK_APP_ID) throw new Error(strings.errors.instagramAppIdMissing);

  if (Platform.OS === 'android') {
    const { isInstalled } = await Share.isPackageInstalled(INSTAGRAM_ANDROID_PACKAGE);
    if (!isInstalled) throw new Error(strings.errors.instagramNotInstalled);
  } else if (!(await Linking.canOpenURL(INSTAGRAM_STORIES_URL))) {
    // On iOS the share writes the pasteboard and reports success even with no Instagram to open.
    throw new Error(strings.errors.instagramNotInstalled);
  }

  await Share.shareSingle({
    social: Social.InstagramStories,
    appId: FACEBOOK_APP_ID,
    ...('backgroundVideoUri' in payload
      ? { backgroundVideo: payload.backgroundVideoUri }
      : { backgroundImage: payload.backgroundImageUri, stickerImage: payload.stickerImageUri }),
    attributionURL: payload.linkUrl,
    linkUrl: payload.linkUrl,
  });
}
