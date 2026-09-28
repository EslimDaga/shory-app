import { StyleSheet, Text, View } from 'react-native';
import { Shield } from 'phosphor-react-native/src/icons/Shield';
import { useStoryClock } from '@/components/motion/StoryClock';
import { strings } from '@/i18n/es';
import { Crest } from './Crest';
import { getTonePalette, type TonePalette } from './tonePalette';
import { readData, type WidgetProps } from './types';
import { WidgetSurface } from './WidgetSurface';

export const MATCH_SIZE = { width: 352, height: 196 };

// Starts empty: two placeholder crests until the teams are picked.
export const MATCH_DEFAULTS = {
  league: '',
  home: '',
  away: '',
  homeScore: '',
  awayScore: '',
  minute: '',
};

// Filled in when a team is picked from the search (not typed by hand): its crest image and its
// football-data.org id, which "sync" uses to find the match between the two teams.
export const CREST_KEYS = { home: 'homeCrest', away: 'awayCrest' } as const;
export const TEAM_ID_KEYS = { home: 'homeId', away: 'awayId' } as const;

const LIVE = '#FF3B30';
const CREST = 56;

type Status = { kind: 'none' } | { kind: 'final' } | { kind: 'live'; label: string };

// The status pill: "Final", a live minute ("78" → 78'), a live label, or nothing.
function readStatus(minute: string): Status {
  const value = minute.trim();
  if (!value) return { kind: 'none' };
  if (/^(ft|fin|final)$/i.test(value)) return { kind: 'final' };
  return { kind: 'live', label: /^\d+(\+\d+)?$/.test(value) ? `${value}'` : value.toUpperCase() };
}

export function MatchWidget({ track, tone, data }: WidgetProps) {
  const palette = getTonePalette(tone, track.accentColor);
  const clock = useStoryClock();
  const values = readData(MATCH_DEFAULTS, data);
  const status = readStatus(values.minute);
  const pulse = clock === null ? 1 : 0.35 + 0.65 * Math.abs(Math.cos(clock * Math.PI * 0.9));
  const hasScore = values.homeScore !== '' || values.awayScore !== '';

  return (
    <WidgetSurface track={track} tone={tone} {...MATCH_SIZE} style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.league, { color: palette.onSurfaceMuted }]} numberOfLines={1}>
          {values.league}
        </Text>
        {status.kind === 'final' && (
          <View style={[styles.status, { backgroundColor: palette.hairline }]}>
            <Text style={[styles.statusText, { color: palette.onSurface }]}>
              {strings.widgets.match.finished}
            </Text>
          </View>
        )}
        {status.kind === 'live' && (
          <View style={[styles.status, styles.liveStatus]}>
            <View style={[styles.liveDot, { opacity: pulse }]} />
            <Text style={[styles.statusText, { color: LIVE }]}>{status.label}</Text>
          </View>
        )}
      </View>

      <View style={styles.row}>
        <Team
          name={values.home}
          placeholder={strings.widgets.match.home}
          crest={data?.[CREST_KEYS.home]}
          palette={palette}
        />
        <View style={styles.scoreBox}>
          {hasScore ? (
            <Text style={[styles.score, { color: palette.onSurface }]}>
              {values.homeScore || '0'}
              <Text style={{ color: palette.onSurfaceMuted }}> – </Text>
              {values.awayScore || '0'}
            </Text>
          ) : (
            <Text style={[styles.versus, { color: palette.onSurfaceMuted }]}>
              {strings.widgets.match.versus}
            </Text>
          )}
        </View>
        <Team
          name={values.away}
          placeholder={strings.widgets.match.away}
          crest={data?.[CREST_KEYS.away]}
          palette={palette}
        />
      </View>
    </WidgetSurface>
  );
}

function Team({
  name,
  placeholder,
  crest,
  palette,
}: {
  name: string;
  placeholder: string;
  crest?: string;
  palette: TonePalette;
}) {
  const empty = !name;
  return (
    <View style={styles.team}>
      <Crest
        uri={crest}
        size={CREST}
        logoScale={0.68}
        placeholder={
          <View style={[styles.crestEmpty, { borderColor: palette.track }]}>
            <Shield size={24} color={palette.onSurfaceMuted} weight="regular" />
          </View>
        }
      />
      <Text
        style={[styles.teamName, { color: empty ? palette.onSurfaceMuted : palette.onSurface }]}
        numberOfLines={1}
      >
        {empty ? placeholder : name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingTop: 14, paddingBottom: 14 },
  header: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  league: { flex: 1, fontSize: 13, fontWeight: '600' },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    height: 24,
    borderRadius: 12,
  },
  liveStatus: { backgroundColor: 'rgba(255, 59, 48, 0.16)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: LIVE },
  statusText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  // Two equal team columns around the score keep the crests mirrored on the card's center line.
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  team: { flex: 1, alignItems: 'center', gap: 8 },
  crestEmpty: {
    width: CREST,
    height: CREST,
    borderRadius: CREST / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  teamName: { fontSize: 13, fontWeight: '600', textAlign: 'center', maxWidth: 110 },
  scoreBox: { minWidth: 108, alignItems: 'center', paddingBottom: 24 },
  score: { fontSize: 40, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  versus: { fontSize: 18, fontWeight: '700', letterSpacing: 1 },
});
