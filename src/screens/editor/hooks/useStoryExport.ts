import { useRef, useState } from 'react';
import type { View } from 'react-native';
import { strings } from '@/i18n/es';
import { shareToInstagramStories } from '@/services/instagram/instagramStories';
import { saveToPhotos } from '@/services/media/photoLibrary';
import { captureStoryImage, captureTransparentPng } from '@/services/media/viewCapture';
import type { TrackMetadata } from '@/types/music';
import type { StoryBackground } from '@/types/storyBackground';
import { getErrorMessage } from '@/utils/errors';
import { hapticImpact, hapticSelection, hapticSuccess } from '@/utils/haptics';

export type ExportAction = 'share' | 'save';

type Options = {
  track: TrackMetadata;
  background: StoryBackground;
  onExported?: (track: TrackMetadata) => void;
  onMessage: (text: string, isError?: boolean) => void;
};

export function useStoryExport({ track, background, onExported, onMessage }: Options) {
  const storyRef = useRef<View>(null);
  const backgroundRef = useRef<View>(null);
  const widgetRef = useRef<View>(null);
  const [pendingAction, setPendingAction] = useState<ExportAction | null>(null);

  const shareToStories = async () => {
    if (pendingAction) return;
    hapticImpact();
    setPendingAction('share');
    try {
      const stickerUri = await captureTransparentPng(widgetRef);
      const isPhoto = background.kind === 'photo';
      await shareToInstagramStories({
        stickerUri,
        backgroundImageUri: isPhoto ? await captureStoryImage(backgroundRef) : undefined,
        backgroundTopColor: isPhoto ? undefined : background.top,
        backgroundBottomColor: isPhoto ? undefined : background.bottom,
        linkUrl: track.url,
      });
      onExported?.(track);
    } catch (error) {
      onMessage(getErrorMessage(error, strings.errors.instagramOpenFailed), true);
    } finally {
      setPendingAction(null);
    }
  };

  const saveStory = async () => {
    if (pendingAction) return;
    hapticSelection();
    setPendingAction('save');
    try {
      await saveToPhotos(await captureStoryImage(storyRef));
      hapticSuccess();
      onMessage(strings.editor.savedToPhotos);
      onExported?.(track);
    } catch (error) {
      onMessage(getErrorMessage(error, strings.errors.saveFailed), true);
    } finally {
      setPendingAction(null);
    }
  };

  return { storyRef, backgroundRef, widgetRef, pendingAction, shareToStories, saveStory };
}
