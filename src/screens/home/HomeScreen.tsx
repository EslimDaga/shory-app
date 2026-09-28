import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { History } from '@/types/history';
import type { TrackMetadata } from '@/types/music';
import { brand, homeColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { useAuth } from '@/providers/AuthProvider';
import { hapticSelection } from '@/utils/haptics';
import { AccountButton } from './components/AccountButton';
import { AccountSheet } from './components/AccountSheet';
import { HelpButton } from './components/HelpButton';
import { HelpSheet } from './components/HelpSheet';
import { HowItWorks } from './components/HowItWorks';
import { OutlinedLogo } from './components/OutlinedLogo';
import { PasteLinkButton } from './components/PasteLinkButton';
import { RecentTracks } from './components/RecentTracks';
import { StatsRow } from './components/StatsRow';
import { StoriesCounter } from './components/StoriesCounter';
import { computeHomeStats } from './homeStats';

const BACKGROUND_IMAGE = require('../../../assets/home-bg.jpg');
const MAX_RECENT_ROWS = 4;

type Props = {
  loading: boolean;
  error: string | null;
  history: History;
  onPasteLink: () => void;
  onOpenRecent: (track: TrackMetadata) => void;
};

export function HomeScreen({ loading, error, history, onPasteLink, onOpenRecent }: Props) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const { user } = useAuth();
  const [sheet, setSheet] = useState<'help' | 'account' | null>(null);
  const [now] = useState(() => Date.now());

  const stats = computeHomeStats(history, now);
  const hasRecents = history.recents.length > 0;

  const openSheet = (next: 'help' | 'account') => {
    hapticSelection();
    setSheet(next);
  };

  return (
    <View style={styles.screen}>
      <Image
        source={BACKGROUND_IMAGE}
        style={[styles.background, { width: window.width, height: window.height }]}
        resizeMode="cover"
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <OutlinedLogo />
          <View style={styles.topActions}>
            {hasRecents && <HelpButton onPress={() => openSheet('help')} />}
            <AccountButton user={user} onPress={() => openSheet('account')} />
          </View>
        </View>

        <StoriesCounter total={stats.total} />

        <View style={styles.card}>
          <StatsRow stats={stats} />
          <View style={styles.cardDivider} />
          {!hasRecents ? (
            <HowItWorks />
          ) : (
            <RecentTracks
              entries={history.recents.slice(0, MAX_RECENT_ROWS)}
              now={now}
              onOpen={(track) => {
                hapticSelection();
                onOpenRecent(track);
              }}
            />
          )}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <PasteLinkButton
          loading={loading}
          onPress={() => {
            hapticSelection();
            onPasteLink();
          }}
        />
      </View>

      <HelpSheet visible={sheet === 'help'} onClose={() => setSheet(null)} />
      <AccountSheet visible={sheet === 'account'} onClose={() => setSheet(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: brand[600] },
  background: { position: 'absolute', top: 0, left: 0 },
  content: { paddingHorizontal: 20, paddingBottom: 140 },
  topBar: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topActions: { flexDirection: 'row', gap: 10 },
  card: {
    backgroundColor: homeColors.card,
    borderRadius: 34,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 12,
    shadowColor: brand[900],
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  cardDivider: { height: 1.5, backgroundColor: homeColors.line, marginTop: 18, marginBottom: 14 },
  errorBox: {
    marginTop: 14,
    backgroundColor: homeColors.card,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  errorText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: homeColors.error,
    textAlign: 'center',
  },
  footer: { position: 'absolute', left: 20, right: 20, bottom: 0 },
});
