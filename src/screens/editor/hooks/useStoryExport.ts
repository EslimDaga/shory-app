import { useEffect, useRef, useState, type RefObject } from 'react';
import type { View } from 'react-native';
import { strings } from '@/i18n/es';
import { openInstagramStoryCamera, shareToInstagramStories } from '@/services/instagram/instagramStories';
import { saveToPhotos } from '@/services/media/photoLibrary';
import { deleteFile, fileExists } from '@/services/media/tempFiles';
import { renderStoryVideo } from '@/services/media/videoExport';
import { captureScreenStill, captureStickerLayer, captureStoryImage } from '@/services/media/viewCapture';
import { createLogger } from '@/services/observability/logger';
import type { TrackMetadata } from '@/types/music';
import { getErrorMessage } from '@/utils/errors';
import { RecordingCancelledError } from 'shory-recorder';
import type { StoryCanvasHandle } from '../components/StoryCanvas';
import { hapticImpact, hapticSelection, hapticSuccess } from '@/utils/haptics';

const log = createLogger('export');

type ExportKind = 'photo' | 'video' | 'template' | 'photo-with-song' | 'video-with-song';

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
  // Set synchronously, unlike `pendingAction`: two taps before the next render can't both start an
  // export (the native recorder can only run one at a time).
  const busy = useRef(false);
  const disposed = useRef(false);

  // Leaving the editor stops a render in progress and deletes the cached video (tens of MB). A
  // save or share still reading it deletes it when it's done instead.
  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      cancelled.current = true;
      if (!busy.current && lastVideo.current) deleteFile(lastVideo.current.uri);
    };
  }, []);

  const run = async (
    action: ExportAction,
    kind: ExportKind,
    haptic: () => void,
    task: () => Promise<void>,
    onError: (error: unknown) => void,
  ) => {
    if (busy.current) return;
    busy.current = true;
    haptic();
    setPendingAction(action);
    const startedAt = Date.now();
    try {
      await task();
      log.info('export done', { action, kind, durationMs: Date.now() - startedAt });
    } catch (error) {
      const attributes = { action, kind, durationMs: Date.now() - startedAt };
      if (error instanceof RecordingCancelledError) log.info('export cancelled', attributes);
      else log.error('export failed', error, attributes);
      onError(error);
    } finally {
      busy.current = false;
      setPendingAction(null);
      if (disposed.current && lastVideo.current) deleteFile(lastVideo.current.uri);
    }
  };

  // A cancelled recording is the user's choice, not a failure.
  const reportUnlessCancelled = (fallback: string) => (error: unknown) => {
    if (!(error instanceof RecordingCancelledError)) onMessage(getErrorMessage(error, fallback), true);
  };

  // Rendering a video is the expensive part, so it's done once per look: sharing and then saving
  // (or sharing twice) without touching the story reuses the file instead of recording again.
  const renderVideo = async () => {
    const key = videoKey();
    const cached = lastVideo.current;
    if (cached?.key === key && fileExists(cached.uri)) return cached.uri;

    cancelled.current = false;
    const previewUri = await captureScreenStill(storyRef).catch(() => null);
    setVideoExport({ progress: 0, previewUri });
    // The overlay shows whole percents: re-rendering on every frame would only slow the recording.
    let lastPercent = 0;
    try {
      const uri = await renderStoryVideo(storyRef.current, {
        durationSeconds,
        backgroundVideo,
        setClock,
        onProgress: (progress) => {
          const percent = Math.round(progress * 100);
          if (percent === lastPercent) return;
          lastPercent = percent;
          setVideoExport({ progress: percent / 100, previewUri });
        },
        shouldCancel: () => cancelled.current,
      });
      if (cached && cached.uri !== uri) deleteFile(cached.uri);
      lastVideo.current = { key, uri };
      // X tapped while the last frame or the encoder was finishing: the file is kept for reuse,
      // but it isn't saved or shared.
      if (cancelled.current) throw new RecordingCancelledError();
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
  const shareVideo = () =>
    run(
      'share',
      'video',
      hapticImpact,
      async () => {
        const backgroundVideoUri = await renderVideo();
        await shareToInstagramStories({ backgroundVideoUri, linkUrl: track.url });
        onExported?.(track);
      },
      reportUnlessCancelled(strings.errors.instagramOpenFailed),
    );

  // Instagram doesn't let a story shared from another app carry a song. So "with the song" saves
  // the finished story to Photos and opens Instagram's story camera: picked from the gallery
  // there, the story takes the Music sticker like any other.
  const shareWithMusic = (video: boolean) =>
    run(
      'share',
      video ? 'video-with-song' : 'photo-with-song',
      hapticImpact,
      async () => {
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
      },
      reportUnlessCancelled(strings.errors.instagramOpenFailed),
    );

  const saveVideo = () =>
    run(
      'save',
      'video',
      hapticSelection,
      async () => {
        await saveToPhotos(await renderVideo());
        hapticSuccess();
        onMessage(strings.editor.videoSaved);
        onExported?.(track);
      },
      reportUnlessCancelled(strings.errors.saveFailed),
    );

  const shareToStories = () =>
    run(
      'share',
      templateActive ? 'template' : 'photo',
      hapticImpact,
      async () => {
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
      },
      (error) => onMessage(getErrorMessage(error, strings.errors.instagramOpenFailed), true),
    );

  const saveStory = () =>
    run(
      'save',
      'photo',
      hapticSelection,
      async () => {
        const imageUri = await captureStoryImage(storyRef);
        try {
          await saveToPhotos(imageUri);
        } finally {
          deleteFile(imageUri);
        }
        hapticSuccess();
        onMessage(strings.editor.savedToPhotos);
        onExported?.(track);
      },
      (error) => onMessage(getErrorMessage(error, strings.errors.saveFailed), true),
    );

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
