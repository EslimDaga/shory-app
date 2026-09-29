import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRightIcon } from '@/components/Icons';
import { SourceLogo } from '@/components/SourceLogo';
import { strings } from '@/i18n/es';
import type { HistoryEntry } from '@/types/history';
import { SOURCE_NAMES, type TrackMetadata } from '@/types/music';
import { brand, homeColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { formatTimeAgo } from '@/utils/time';

type Props = {
  entries: HistoryEntry[];
  now: number;
  onOpen: (track: TrackMetadata) => void;
};

export function RecentTracks({ entries, now, onOpen }: Props) {
  return (
    <View>
      <Text style={styles.title}>{strings.home.recent}</Text>
      {entries.map(({ track, exportedAt }) => {
        const timeAgo = formatTimeAgo(exportedAt, now);
        return (
          <Pressable
            key={track.url}
            accessibilityRole="button"
            // The label replaces the row's content for screen readers, so it carries all of it.
            aria-label={[
              strings.home.openTrack(track.title),
              track.artist,
              timeAgo,
              SOURCE_NAMES[track.source],
            ]
              .filter(Boolean)
              .join(', ')}
            onPress={() => onOpen(track)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Image source={{ uri: track.coverUrl }} style={styles.cover} />
            <View style={styles.text}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {track.title}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[track.artist, timeAgo].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <SourceLogo source={track.source} size={20} />
            <ChevronRightIcon size={16} color={homeColors.chevron} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    color: homeColors.ink,
    marginBottom: 6,
    marginLeft: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 16,
  },
  rowPressed: { backgroundColor: brand[50] },
  cover: { width: 48, height: 48, borderRadius: 12, backgroundColor: homeColors.line },
  text: { flex: 1 },
  trackTitle: { fontFamily: fonts.sansSemiBold, fontSize: 17, color: homeColors.ink },
  meta: { fontFamily: fonts.sansMedium, fontSize: 14, color: homeColors.inkMuted, marginTop: 1 },
});
