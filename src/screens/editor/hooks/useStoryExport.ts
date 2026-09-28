import { useRef, useState, type RefObject } from 'react';
import type { View } from 'react-native';
import { File } from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import { strings } from '@/i18n/es';
import { openInstagramStoryCamera, shareToInstagramStories } from '@/services/instagram/instagramStories';
import { saveToPhotos } from '@/services/media/photoLibrary';
import { renderStoryVideo } from '@/services/media/videoExport';
import { captureStickerLayer, captureStoryImage } from '@/services/media/viewCapture';
import type { TrackMetadata } from '@/types/music';
import { getErrorMessage } from '@/utils/errors';
import { RecordingCancelledError } from 'shory-recorder';
import type { StoryCanvasHandle } from '../components/StoryCanvas';
import { hapticImpact, hapticSelection, hapticSuccess } from '@/utils/haptics';

export type ExportAction = 'share' | 'save';

export type ExportFormat = 'photo' | 'video';

export type VideoExport = { progress: number; previewUri: string | null };

export const STORY_VIDEO_SECONDS = 10;

type Options = {
  track: TrackMetadata;
  canvasRef: RefObject<StoryCanvasHandle | null>;
  setClock: (seconds: number | null) => void;
  // A full-story template: the whole story is one image/clip, with no separate sticker.
  templateActive: boolean;
  // Free plan: every export carries the Shory mark. In the direct Instagram share it rides on the
  // widget's movable sticker, so the widget can't be dragged over it.
  watermark: boolean;
  backgroundVideo: string | null;
  // Length of the video export, in seconds.
  durationSeconds: number;
  // Everything the video depends on, serialized. Same key → the last render is reused.
  videoKey: () => string;
  onExported?: (track: TrackMetadata) => void;
  onMessage: (text: string, isError?: boolean) => void;
};

const fileExists = (uri: string) => {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
};

const deleteFile = (uri: string) => {
  try {
    new File(uri).delete();
  } catch {}
};

export function useStoryExport({
  track,
  canvasRef,
  setClock,
  templateActive,
  watermark,
  backgroundVideo,
  durationSeconds,
  videoKey,
  onExported,
  onMessage,
}: Options) {
  const storyRef = useRef<View>(null);
  const backgroundRef = useRef<View>(null);
  const stickerRef = useRef<View>(null);
  const [pendingAction, setPendingAction] = useState<ExportAction | null>(null);
  const [videoExport, setVideoExport] = useState<VideoExport | null>(null);
  const cancelled = useRef(false);
  const lastVideo = useRef<{ key: string; uri: string } | null>(null);

  // Rendering a video is the expensive part, so it's done once per look: sharing and then saving
  // (or sharing twice) without touching the story reuses the file instead of recording again.
  const renderVideo = async () => {
    const key = videoKey();
    const cached = lastVideo.current;
    if (cached?.key === key && fileExists(cached.uri)) return cached.uri;

    cancelled.current = false;
    const previewUri = await captureRef(storyRef, { format: 'jpg', quality: 0.8, result: 'tmpfile' }).catch(
      () => null,
    );
    setVideoExport({ progress: 0, previewUri });
    try {
      const uri = await renderStoryVideo(storyRef.current, {
        durationSeconds,
        backgroundVideo,
        setClock,
        onProgress: (progress) => setVideoExport({ progress, previewUri }),
        shouldCancel: () => cancelled.current,
      });
      if (cached && cached.uri !== uri) deleteFile(cached.uri);
      lastVideo.current = { key, uri };
      return uri;
    } finally {
      setVideoExport(null);
      if (previewUri) deleteFile(previewUri);
    }
  };

  const cancelVideo = () => {
    cancelled.current = true;
  };

  // The video carries the widget baked in, animated, at its exact position — Instagram can't
  // animate a sticker, so the whole story travels as one background video.
  const shareVideo = async () => {
    if (pendingAction) return;
    hapticImpact();
    setPendingAction('share');
    try {
      const backgroundVideoUri = await renderVideo();
      await shareToInstagramStories({ backgroundVideoUri, linkUrl: track.url });
      onExported?.(track);
    } catch (error) {
      if (!(error instanceof RecordingCancelledError)) {
        onMessage(getErrorMessage(error, strings.errors.instagramOpenFailed), true);
      }
    } finally {
      setPendingAction(null);
    }
  };

  // Instagram doesn't let a story shared from another app carry a song. So "with the song" saves
  // the finished story to Photos and opens Instagram's story camera: picked from the gallery
  // there, the story takes the Music sticker like any other.
  const shareWithMusic = async (video: boolean) => {
    if (pendingAction) return;
    hapticImpact();
    setPendingAction('share');
    try {
      if (video) {
        await saveToPhotos(await renderVideo());
      } else {
        const imageUri = await captureStoryImage(storyRef);
        try {
          await saveToPhotos(imageUri);
        } finally {
          deleteFile(imageUri);
        }
      }
      await openInstagramStoryCamera();
      onExported?.(track);
    } catch (error) {
      if (!(error instanceof RecordingCancelledError)) {
        onMessage(getErrorMessage(error, strings.errors.instagramOpenFailed), true);
      }
    } finally {
      setPendingAction(null);
    }
  };

  const saveVideo = async () => {
    if (pendingAction) return;
    hapticSelection();
    setPendingAction('save');
    try {
      await saveToPhotos(await renderVideo());
      hapticSuccess();
      onMessage(strings.editor.videoSaved);
      onExported?.(track);
    } catch (error) {
      if (!(error instanceof RecordingCancelledError)) {
        onMessage(getErrorMessage(error, strings.errors.saveFailed), true);
      }
    } finally {
      setPendingAction(null);
    }
  };

  const shareToStories = async () => {
    if (pendingAction) return;
    hapticImpact();
    setPendingAction('share');
    try {
      if (templateActive) {
        const backgroundImageUri = await captureStoryImage(storyRef);
        try {
          await shareToInstagramStories({ backgroundImageUri, linkUrl: track.url });
        } finally {
          deleteFile(backgroundImageUri);
        }
        onExported?.(track);
        return;
      }
      // Instagram always centers the sticker and has no way to position it, so the sticker is a
      // transparent layer the size of the whole story with the widget where the user placed it:
      // centered over the background, it lines up, and it stays a separate, movable sticker.
      const restore = await canvasRef.current?.prepareStickerCapture({ watermark });
      let backgroundImageUri: string;
      let stickerImageUri: string;
      try {
        [backgroundImageUri, stickerImageUri] = await Promise.all([
          captureStoryImage(backgroundRef),
          captureStickerLayer(stickerRef),
        ]);
      } finally {
        restore?.();
      }
      try {
        await shareToInstagramStories({ backgroundImageUri, stickerImageUri, linkUrl: track.url });
      } finally {
        // Instagram gets the images through the pasteboard; the capture files aren't needed after.
        deleteFile(backgroundImageUri);
        deleteFile(stickerImageUri);
      }
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
      const imageUri = await captureStoryImage(storyRef);
      try {
        await saveToPhotos(imageUri);
      } finally {
        deleteFile(imageUri);
      }
      hapticSuccess();
      onMessage(strings.editor.savedToPhotos);
      onExported?.(track);
    } catch (error) {
      onMessage(getErrorMessage(error, strings.errors.saveFailed), true);
    } finally {
      setPendingAction(null);
    }
  };

  return {
    storyRef,
    backgroundRef,
    stickerRef,
    pendingAction,
    videoExport,
    recording: videoExport !== null,
    shareToStories,
    shareWithMusic,
    saveStory,
    shareVideo,
    saveVideo,
    cancelVideo,
  };
}
