import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowsClockwise } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { MagnifyingGlass } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { Shield } from 'phosphor-react-native/src/icons/Shield';
import { X } from 'phosphor-react-native/src/icons/X';
import { strings } from '@/i18n/es';
import { searchTeams, syncMatch, teamLabel, type FootballTeam } from '@/services/data/football';
import { fetchWeather, searchCities, type City } from '@/services/data/weather';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { createLogger } from '@/services/observability/logger';
import { getErrorMessage } from '@/utils/errors';
import { hapticSelection, hapticSuccess } from '@/utils/haptics';
import { Crest } from '@/widgets/Crest';
import { CREST_KEYS, TEAM_ID_KEYS } from '@/widgets/MatchWidget';
import type { WidgetData, WidgetLiveSource } from '@/widgets/types';
import { COUNTRY_KEY } from '@/widgets/WeatherCardWidget';
import { HOURLY_KEY } from '@/widgets/WeatherWidget';

type Props = {
  source: WidgetLiveSource;
  // What the widget holds now (typed or fetched), with its defaults filled in.
  values: WidgetData;
  onFill: (patch: WidgetData) => void;
};

const text = strings.widgets.live;
const log = createLogger('live-data');
const SEARCH_DELAY_MS = 250;

// Fills a widget's fields from a public API. Whatever it fills stays editable by hand below.
export function WidgetLiveSection({ source, values, onFill }: Props) {
  return (
    <View style={styles.section}>
      {source === 'weather' ? (
        <WeatherSearch onFill={onFill} />
      ) : (
        <FootballPicker values={values} onFill={onFill} />
      )}
      <Text style={styles.credit}>{source === 'weather' ? text.weatherCredit : text.footballCredit}</Text>
    </View>
  );
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

// Type-ahead search: runs once typing pauses, and a slower, older answer never replaces a newer one.
function useTypeahead<T>(query: string, search: (term: string) => Promise<T[]>) {
  const [results, setResults] = useState<{ term: string; items: T[] } | null>(null);
  // Tied to its term, so an old failure doesn't linger under a cleared field or a new search.
  const [failed, setFailed] = useState<{ term: string; message: string } | null>(null);
  const term = query.trim();

  useEffect(() => {
    if (term.length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      // A retry of the same term starts clean.
      setFailed(null);
      search(term)
        .then((items) => active && setResults({ term, items }))
        .catch((error) => {
          log.error('search failed', error);
          if (active) setFailed({ term, message: getErrorMessage(error, text.failed) });
        });
    }, SEARCH_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term, search]);

  const ready = term.length >= 2 && results?.term === term;
  const error = term.length >= 2 && failed?.term === term ? failed.message : null;
  return {
    items: ready ? results.items : [],
    searching: term.length >= 2 && !ready && !error,
    empty: ready && results.items.length === 0,
    failed: error,
  };
}

function SearchField({
  value,
  placeholder,
  busy,
  onChange,
}: {
  value: string;
  placeholder: string;
  busy: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.searchField}>
      <MagnifyingGlass size={18} color={editorColors.textMuted} weight="bold" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={editorColors.textFaint}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={styles.searchInput}
      />
      {busy ? (
        <ActivityIndicator size="small" color={editorColors.textMuted} />
      ) : value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.clear}
          hitSlop={8}
          onPress={() => onChange('')}
        >
          <X size={16} color={editorColors.textMuted} weight="bold" />
        </Pressable>
      ) : null}
    </View>
  );
}

// The dropdown under a search field.
function Suggestions({ children }: { children: ReactNode }) {
  return <View style={styles.dropdown}>{children}</View>;
}

function Suggestion({
  title,
  subtitle,
  leading,
  last,
  onPress,
}: {
  title: string;
  subtitle: string;
  leading?: ReactNode;
  last: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.suggestion,
        !last && styles.suggestionDivider,
        pressed && styles.pressed,
      ]}
    >
      {leading}
      <View style={styles.flex}>
        <Text style={styles.suggestionTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.suggestionSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function WeatherSearch({ onFill }: { onFill: (patch: WidgetData) => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const { items, searching, empty, failed } = useTypeahead(query, searchCities);
  // Bumped by each pick, so a slower answer for an earlier city is dropped.
  const request = useRef(0);

  const choose = async (city: City) => {
    const id = ++request.current;
    hapticSelection();
    setStatus({ kind: 'loading' });
    setQuery('');
    try {
      const weather = await fetchWeather(city);
      if (id !== request.current) return;
      onFill({
        city: city.name,
        temp: String(weather.temp),
        condition: weather.condition,
        high: String(weather.high),
        low: String(weather.low),
        wind: String(weather.wind),
        [COUNTRY_KEY]: city.countryCode ?? '',
        [HOURLY_KEY]: weather.hours.map((hour) => `${hour.hour}:${hour.temp}:${hour.condition}`).join(','),
      });
      hapticSuccess();
      setStatus({ kind: 'done', message: text.weatherFilled(city.name) });
    } catch (error) {
      log.error('weather fetch failed', error);
      if (id !== request.current) return;
      setStatus({ kind: 'error', message: getErrorMessage(error, text.failed) });
    }
  };

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{text.cityLabel}</Text>
      <SearchField
        value={query}
        placeholder={text.cityPlaceholder}
        busy={searching || status.kind === 'loading'}
        onChange={(next) => {
          setQuery(next);
          setStatus({ kind: 'idle' });
        }}
      />
      {items.length > 0 && (
        <Suggestions>
          {items.map((city, index) => (
            <Suggestion
              key={city.id}
              title={city.name}
              subtitle={[city.region, city.country].filter(Boolean).join(', ')}
              last={index === items.length - 1}
              onPress={() => choose(city)}
            />
          ))}
        </Suggestions>
      )}
      {empty && <Text style={styles.hint}>{text.noCities}</Text>}
      {failed && <Text style={styles.error}>{failed}</Text>}
      <StatusLine status={status} />
    </View>
  );
}

type Side = 'home' | 'away';

// Pick both teams (with their crests), optionally sync the real score, or set it by hand.
function FootballPicker({ values, onFill }: { values: WidgetData; onFill: (patch: WidgetData) => void }) {
  const [side, setSide] = useState<Side>(values.home ? 'away' : 'home');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const { items, searching, empty, failed } = useTypeahead(query, searchTeams);
  // Bumped by each sync and each team pick, so a slower sync for an earlier pair is dropped.
  const request = useRef(0);

  const teamIds = {
    home: Number(values[TEAM_ID_KEYS.home]) || null,
    away: Number(values[TEAM_ID_KEYS.away]) || null,
  };

  const choose = (team: FootballTeam) => {
    request.current++;
    hapticSelection();
    // A different team makes it a different match: the synced league, score and status go too.
    const replacing = teamIds[side] !== null && teamIds[side] !== team.id;
    onFill({
      [side]: teamLabel(team),
      [CREST_KEYS[side]]: team.crest ?? '',
      [TEAM_ID_KEYS[side]]: String(team.id),
      ...(replacing ? { league: '', homeScore: '', awayScore: '', minute: '' } : {}),
    });
    setQuery('');
    setStatus({ kind: 'idle' });
    if (side === 'home' && !values.away) setSide('away');
  };

  const sync = async () => {
    if (!teamIds.home || !teamIds.away) {
      setStatus({ kind: 'error', message: text.syncNeedsTeams });
      return;
    }
    if (teamIds.home === teamIds.away) {
      setStatus({ kind: 'error', message: text.syncSameTeam });
      return;
    }
    const id = ++request.current;
    hapticSelection();
    setStatus({ kind: 'loading' });
    try {
      const match = await syncMatch(teamIds.home, teamIds.away);
      if (id !== request.current) return;
      if (!match) {
        setStatus({ kind: 'error', message: text.noMatch });
        return;
      }
      const league = match.matchday ? text.matchday(match.competition, match.matchday) : match.competition;
      if (match.status === 'scheduled') {
        onFill({ league, homeScore: '', awayScore: '', minute: '' });
        setStatus({ kind: 'done', message: text.scheduled });
        return;
      }
      // Scores follow the teams as the user placed them, even if the real match had them swapped.
      const swapped = match.home.id !== teamIds.home;
      const homeScore = swapped ? match.awayScore : match.homeScore;
      const awayScore = swapped ? match.homeScore : match.awayScore;
      onFill({
        league,
        homeScore: String(homeScore ?? 0),
        awayScore: String(awayScore ?? 0),
        minute: match.status === 'live' ? strings.widgets.match.live : strings.widgets.match.finished,
      });
      hapticSuccess();
      setStatus({ kind: 'done', message: text.synced });
    } catch (error) {
      log.error('match sync failed', error);
      if (id !== request.current) return;
      setStatus({ kind: 'error', message: getErrorMessage(error, text.failed) });
    }
  };

  const nudge = (key: 'homeScore' | 'awayScore', delta: number) => {
    hapticSelection();
    const current = Number.parseInt(values[key] ?? '', 10) || 0;
    onFill({ [key]: String(Math.max(0, Math.min(99, current + delta))) });
  };

  const setMatchStatus = (minute: string) => {
    hapticSelection();
    onFill({ minute });
  };

  return (
    <View style={styles.block}>
      <View style={styles.slots}>
        {(['home', 'away'] as const).map((option) => (
          <TeamSlot
            key={option}
            label={option === 'home' ? strings.widgets.match.home : strings.widgets.match.away}
            name={values[option]}
            crest={values[CREST_KEYS[option]]}
            active={side === option}
            onPress={() => {
              hapticSelection();
              setSide(option);
            }}
          />
        ))}
      </View>

      <SearchField
        value={query}
        placeholder={side === 'home' ? text.homePlaceholder : text.awayPlaceholder}
        busy={searching}
        onChange={(next) => {
          setQuery(next);
          setStatus({ kind: 'idle' });
        }}
      />
      {items.length > 0 && (
        <Suggestions>
          {items.map((team, index) => (
            <Suggestion
              key={team.id}
              title={teamLabel(team)}
              subtitle={team.name === teamLabel(team) ? '' : team.name}
              leading={<CrestDisc uri={team.crest} size={32} />}
              last={index === items.length - 1}
              onPress={() => choose(team)}
            />
          ))}
        </Suggestions>
      )}
      {empty && <Text style={styles.hint}>{text.noTeams}</Text>}
      {failed && <Text style={styles.error}>{failed}</Text>}

      <View style={styles.scoreRow}>
        <Stepper
          label={values.home || strings.widgets.match.home}
          value={values.homeScore || '0'}
          onDown={() => nudge('homeScore', -1)}
          onUp={() => nudge('homeScore', 1)}
        />
        <Stepper
          label={values.away || strings.widgets.match.away}
          value={values.awayScore || '0'}
          onDown={() => nudge('awayScore', -1)}
          onUp={() => nudge('awayScore', 1)}
        />
      </View>

      <View style={styles.chips}>
        {[
          { label: text.statusNone, minute: '' },
          { label: strings.widgets.match.live, minute: strings.widgets.match.live },
          { label: strings.widgets.match.finished, minute: strings.widgets.match.finished },
        ].map((option) => {
          const active = (values.minute ?? '') === option.minute;
          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              aria-selected={active}
              onPress={() => setMatchStatus(option.minute)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityHint={text.syncHint}
        onPress={sync}
        disabled={status.kind === 'loading'}
        style={({ pressed }) => [
          styles.action,
          !(teamIds.home && teamIds.away && teamIds.home !== teamIds.away) && styles.actionMuted,
          pressed && styles.pressed,
        ]}
      >
        {status.kind === 'loading' ? (
          <ActivityIndicator color={editorColors.onAccent} />
        ) : (
          <>
            <ArrowsClockwise size={18} color={editorColors.onAccent} weight="bold" />
            <Text style={styles.actionText}>{text.sync}</Text>
          </>
        )}
      </Pressable>
      <StatusLine status={status} />
    </View>
  );
}

function TeamSlot({
  label,
  name,
  crest,
  active,
  onPress,
}: {
  label: string;
  name?: string;
  crest?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      aria-selected={active}
      accessibilityLabel={`${label}: ${name || text.noTeamYet}`}
      onPress={onPress}
      style={[styles.slot, active && styles.slotActive]}
    >
      <CrestDisc uri={crest} size={40} />
      <View style={styles.flex}>
        <Text style={styles.slotLabel}>{label}</Text>
        <Text style={[styles.slotName, !name && styles.slotNameEmpty]} numberOfLines={1}>
          {name || text.noTeamYet}
        </Text>
      </View>
    </Pressable>
  );
}

function CrestDisc({ uri, size }: { uri?: string | null; size: number }) {
  return (
    <Crest
      uri={uri}
      size={size}
      logoScale={0.7}
      placeholder={
        <View style={[styles.crestEmpty, { width: size, height: size, borderRadius: size / 2 }]}>
          <Shield size={size * 0.45} color={editorColors.textMuted} />
        </View>
      }
    />
  );
}

function Stepper({
  label,
  value,
  onDown,
  onUp,
}: {
  label: string;
  value: string;
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.stepperControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.scoreDown(label)}
          onPress={onDown}
          hitSlop={6}
          style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
        >
          <Text style={styles.stepperSymbol}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.scoreUp(label)}
          onPress={onUp}
          hitSlop={6}
          style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
        >
          <Text style={styles.stepperSymbol}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === 'done') return <Text style={styles.done}>{status.message}</Text>;
  if (status.kind === 'error') return <Text style={styles.error}>{status.message}</Text>;
  return null;
}

const styles = StyleSheet.create({
  section: { gap: 10, paddingBottom: 6 },
  block: { gap: 10 },
  flex: { flex: 1 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: editorColors.textMuted },
  searchField: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: editorColors.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: editorColors.text,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
  },
  dropdown: {
    borderRadius: 14,
    backgroundColor: editorColors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: editorColors.hairline,
    overflow: 'hidden',
    marginTop: -4,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  suggestionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: editorColors.hairline,
  },
  suggestionTitle: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: editorColors.text },
  suggestionSubtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: editorColors.textMuted,
    marginTop: 1,
  },
  slots: { flexDirection: 'row', gap: 8 },
  slot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    backgroundColor: editorColors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  slotActive: { borderColor: editorColors.accent },
  slotLabel: { fontFamily: fonts.sansSemiBold, fontSize: 11, color: editorColors.textMuted },
  slotName: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: editorColors.text, marginTop: 1 },
  slotNameEmpty: { color: editorColors.textFaint },
  crestEmpty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: editorColors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: { flexDirection: 'row', gap: 8 },
  stepper: { flex: 1, padding: 10, borderRadius: 14, backgroundColor: editorColors.surfaceRaised, gap: 6 },
  stepperLabel: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: editorColors.textMuted },
  stepperControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: editorColors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSymbol: { fontFamily: fonts.sansSemiBold, fontSize: 20, color: editorColors.text, marginTop: -2 },
  stepperValue: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 24,
    color: editorColors.text,
    fontVariant: ['tabular-nums'],
  },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: editorColors.surfaceRaised,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: editorColors.text },
  chipText: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: editorColors.textMuted },
  chipTextActive: { color: editorColors.background },
  action: {
    height: 48,
    borderRadius: 24,
    backgroundColor: editorColors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionMuted: { opacity: 0.5 },
  actionText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: editorColors.onAccent },
  pressed: { opacity: 0.7 },
  hint: { fontFamily: fonts.sansMedium, fontSize: 13, color: editorColors.textMuted },
  done: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: editorColors.accent },
  error: { fontFamily: fonts.sansMedium, fontSize: 13, color: editorColors.danger },
  credit: { fontFamily: fonts.sansMedium, fontSize: 11, color: editorColors.textFaint },
});
