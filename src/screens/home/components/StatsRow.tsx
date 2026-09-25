import { StyleSheet, Text, View } from 'react-native';
import { SourceLogo } from '@/components/SourceLogo';
import { strings } from '@/i18n/es';
import { homeColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import type { HomeStats } from '../homeStats';

type Props = { stats: HomeStats };

const EMPTY_VALUE = '—';

export function StatsRow({ stats }: Props) {
  return (
    <View style={styles.row}>
      <StatItem label={strings.home.thisWeek}>
        <Text style={styles.value}>{stats.thisWeek}</Text>
      </StatItem>
      <View style={styles.divider} />
      <StatItem label={strings.home.artists}>
        <Text style={styles.value}>{stats.artistCount}</Text>
      </StatItem>
      <View style={styles.divider} />
      <StatItem label={strings.home.favorite}>
        {stats.favoriteSource ? (
          <View style={styles.logoValue}>
            <SourceLogo source={stats.favoriteSource} size={26} />
          </View>
        ) : (
          <Text style={styles.value}>{EMPTY_VALUE}</Text>
        )}
      </StatItem>
    </View>
  );
}

function StatItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: homeColors.inkMuted },
  value: { fontFamily: fonts.sansExtraBold, fontSize: 30, color: homeColors.ink },
  logoValue: { height: 36, justifyContent: 'center' },
  divider: { width: 2, height: 30, borderRadius: 1, backgroundColor: homeColors.line },
});
