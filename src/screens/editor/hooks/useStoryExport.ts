import { useRef, useState } from 'react';
import type { View } from 'react-native';
import { strings } from '@/i18n/es';
import { shareToInstagramStories } from '@/services/instagram/instagramStories';
import { saveToPhotos } from '@/services/media/photoLibrary';
import { captureStoryImage } from '@/services/media/viewCapture';
import type { TrackMetadata } from '@/types/music';
import { getErrorMessage } from '@/utils/errors';
import { hapticImpact, hapticSelection, hapticSuccess } from '@/utils/haptics';

export type ExportAction = 'share' | 'save';

type Options = {
  track: TrackMetadata;
  onExported?: (track: TrackMetadata) => void;
  onMessage: (text: string, isError?: boolean) => void;
};

export function useStoryExport({ track, onExported, onMessage }: Options) {
  const storyRef = useRef<View>(null);
  const [pendingAction, setPendingAction] = useState<ExportAction | null>(null);

  const shareToStories = async () => {
    if (pendingAction) return;
    hapticImpact();
    setPendingAction('share');
    try {
      await shareToInstagramStories({
        storyImageUri: await captureStoryImage(storyRef),
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

  return { storyRef, pendingAction, shareToStories, saveStory };
}
