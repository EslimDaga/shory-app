import * as Clipboard from 'expo-clipboard';
import { useLinkingURL } from 'expo-linking';
import { useShareIntent } from 'expo-share-intent';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform } from 'react-native';
import { strings } from '@/i18n/es';
import { extractMusicLink, fetchTrackMetadata } from '@/services/music/musicService';
import type { TrackMetadata } from '@/types/music';
import { getErrorMessage } from '@/utils/errors';
import { hapticError } from '@/utils/haptics';

export type TrackLoaderState =
  | { status: 'idle'; error: string | null }
  | { status: 'loading' }
  | { status: 'ready'; track: TrackMetadata };

const DEV_OPEN_URL_PREFIX = '://open?url=';
// Warming the cover only makes the editor open with it painted; past this the Image loads it itself.
const COVER_PREFETCH_TIMEOUT_MS = 3000;

async function prefetchCover(url: string): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Image.prefetch(url).catch(() => false),
    new Promise((resolve) => {
      timer = setTimeout(resolve, COVER_PREFETCH_TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));
}

export function useTrackLoader() {
  const [state, setState] = useState<TrackLoaderState>({ status: 'idle', error: null });
  // Every action takes a new id; a load only commits its result if nothing newer happened meanwhile.
  const requestId = useRef(0);
  const { hasShareIntent, shareIntent, resetShareIntent, error: shareIntentError } = useShareIntent();
  const linkingUrl = useLinkingURL();

  const loadFromText = useCallback(async (text: string) => {
    const id = ++requestId.current;
    const link = extractMusicLink(text);
    if (!link) {
      hapticError();
      setState({ status: 'idle', error: strings.errors.noMusicLink });
      return;
    }
    setState({ status: 'loading' });
    try {
      const track = await fetchTrackMetadata(link);
      await prefetchCover(track.coverUrl);
      if (id === requestId.current) setState({ status: 'ready', track });
    } catch (error) {
      if (id !== requestId.current) return;
      hapticError();
      setState({ status: 'idle', error: getErrorMessage(error) });
    }
  }, []);

  useEffect(() => {
    if (!hasShareIntent) return;
    loadFromText(shareIntent.webUrl ?? shareIntent.text ?? '');
    resetShareIntent();
  }, [hasShareIntent, shareIntent, loadFromText, resetShareIntent]);

  // Show a failed share once, as a regular load error. It waits until nothing else is on screen (a
  // share failing while the editor is open shows on Home after close()), and only then resets the
  // library's error, which would otherwise come back after every close().
  const idle = state.status === 'idle';
  useEffect(() => {
    if (!shareIntentError || !idle) return;
    setState({ status: 'idle', error: strings.errors.unknown });
    resetShareIntent();
  }, [shareIntentError, idle, resetShareIntent]);

  useEffect(() => {
    if (!__DEV__ || !linkingUrl?.includes(DEV_OPEN_URL_PREFIX)) return;
    loadFromText(decodeURIComponent(linkingUrl.split(DEV_OPEN_URL_PREFIX)[1]));
  }, [linkingUrl, loadFromText]);

  useEffect(() => {
    const devTrackUrl = process.env.EXPO_PUBLIC_DEV_TRACK_URL;
    if (__DEV__ && devTrackUrl) loadFromText(devTrackUrl);
  }, [loadFromText]);

  const loadFromClipboard = useCallback(async () => {
    const id = ++requestId.current;
    let text: string;
    try {
      // iOS asks "Allow Paste" on every read, but checking for text does not: skip the prompt when
      // there is nothing to paste. An empty read after that means the person denied it.
      const hasText = Platform.OS !== 'ios' || (await Clipboard.hasStringAsync());
      text = hasText ? await Clipboard.getStringAsync() : '';
      if (hasText && !text && Platform.OS === 'ios') throw new Error('Paste denied');
    } catch {
      // Web rejects without permission or on an insecure origin; its English message is no use here.
      if (id !== requestId.current) return;
      hapticError();
      setState({ status: 'idle', error: strings.errors.clipboardUnavailable });
      return;
    }
    if (id === requestId.current) await loadFromText(text);
  }, [loadFromText]);

  const openTrack = useCallback((track: TrackMetadata) => {
    requestId.current++;
    setState({ status: 'ready', track });
  }, []);

  const close = useCallback(() => {
    requestId.current++;
    setState({ status: 'idle', error: null });
  }, []);

  const error = state.status === 'idle' ? state.error : null;

  return { state, error, loadFromClipboard, openTrack, close };
}
