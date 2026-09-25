import * as Clipboard from 'expo-clipboard';
import { useLinkingURL } from 'expo-linking';
import { useShareIntent } from 'expo-share-intent';
import { useCallback, useEffect, useState } from 'react';
import { Image } from 'react-native';
import { strings } from '@/i18n/es';
import { extractMusicLink, fetchTrackMetadata } from '@/services/music/musicService';
import type { TrackMetadata } from '@/types/music';
import { getErrorMessage } from '@/utils/errors';

export type TrackLoaderState =
  | { status: 'idle'; error: string | null }
  | { status: 'loading' }
  | { status: 'ready'; track: TrackMetadata };

const DEV_OPEN_URL_PREFIX = '://open?url=';

export function useTrackLoader() {
  const [state, setState] = useState<TrackLoaderState>({ status: 'idle', error: null });
  const { hasShareIntent, shareIntent, resetShareIntent, error: shareIntentError } = useShareIntent();
  const linkingUrl = useLinkingURL();

  const loadFromText = useCallback(async (text: string) => {
    const link = extractMusicLink(text);
    if (!link) {
      setState({ status: 'idle', error: strings.errors.noMusicLink });
      return;
    }
    setState({ status: 'loading' });
    try {
      const track = await fetchTrackMetadata(link);
      await Image.prefetch(track.coverUrl).catch(() => false);
      setState({ status: 'ready', track });
    } catch (error) {
      setState({ status: 'idle', error: getErrorMessage(error) });
    }
  }, []);

  useEffect(() => {
    if (!hasShareIntent) return;
    loadFromText(shareIntent.webUrl ?? shareIntent.text ?? '');
    resetShareIntent();
  }, [hasShareIntent, shareIntent, loadFromText, resetShareIntent]);

  useEffect(() => {
    if (!__DEV__ || !linkingUrl?.includes(DEV_OPEN_URL_PREFIX)) return;
    loadFromText(decodeURIComponent(linkingUrl.split(DEV_OPEN_URL_PREFIX)[1]));
  }, [linkingUrl, loadFromText]);

  useEffect(() => {
    const devTrackUrl = process.env.EXPO_PUBLIC_DEV_TRACK_URL;
    if (__DEV__ && devTrackUrl) loadFromText(devTrackUrl);
  }, [loadFromText]);

  const loadFromClipboard = useCallback(async () => {
    loadFromText(await Clipboard.getStringAsync());
  }, [loadFromText]);

  const openTrack = useCallback((track: TrackMetadata) => {
    setState({ status: 'ready', track });
  }, []);

  const close = useCallback(() => {
    setState({ status: 'idle', error: null });
  }, []);

  const error =
    state.status === 'idle'
      ? (state.error ?? (shareIntentError ? String(shareIntentError) : null))
      : null;

  return { state, error, loadFromClipboard, openTrack, close };
}
