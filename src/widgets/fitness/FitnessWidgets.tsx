import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Barbell } from 'phosphor-react-native/src/icons/Barbell';
import { Clock } from 'phosphor-react-native/src/icons/Clock';
import { Fire } from 'phosphor-react-native/src/icons/Fire';
import { Footprints } from 'phosphor-react-native/src/icons/Footprints';
import { Heart } from 'phosphor-react-native/src/icons/Heart';
import { Heartbeat } from 'phosphor-react-native/src/icons/Heartbeat';
import { Lightning } from 'phosphor-react-native/src/icons/Lightning';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { strings } from '@/i18n/es';
import { withAlpha } from '@/utils/color';
import { getTonePalette, type TonePalette } from '../tonePalette';
import { readData, toNumber, type WidgetProps } from '../types';
import { WidgetSurface } from '../WidgetSurface';
import {
  Bars,
  Caption,
  clamp01,
  FIT_MEDIUM,
  FIT_MEDIUM_CONTENT,
  FIT_RADIUS,
  FIT_SMALL,
  FIT_TALL,
  Label,
  ProgressBar,
  Ring,
  Sparkline,
  Stat,
  thousands,
  Value,
} from './parts';

const text = strings.widgets.fitness;

function useCard({ track, tone, data }: WidgetProps) {
  return { palette: getTonePalette(tone, track.accentColor), track, tone, data };
}

// ---------------------------------------------------------------------------------------------
// Small (square)

export const STEPS_DEFAULTS = { steps: '13450' };
const STEPS_CURVE = [18, 22, 20, 30, 26, 44, 40, 62, 55, 58, 76, 70];

export function StepsWidget(props: WidgetProps) {
  const { palette, track, tone, data } = useCard(props);
  const values = readData(STEPS_DEFAULTS, data);
  return (
    <WidgetSurface
      track={track}
      tone={tone}
      {...FIT_SMALL}
      radius={FIT_RADIUS}
      vignette={{ x: 0.5, y: 0 }}
      style={styles.small}
    >
      <Label palette={palette}>{text.steps.title}</Label>
      <Value palette={palette} value={thousands(toNumber(values.steps))} size={34} style={styles.tight} />
      <Caption palette={palette}>{text.steps.unit}</Caption>
      <View style={styles.fillBottom}>
        <Sparkline palette={palette} values={STEPS_CURVE} width={140} height={54} id="steps" />
      </View>
    </WidgetSurface>
  );
}

export const HEART_DEFAULTS = { bpm: '95', average: '110' };

export function HeartWidget(props: WidgetProps) {
  const { palette, track, tone, data } = useCard(props);
  const values = readData(HEART_DEFAULTS, data);
  return (
    <WidgetSurface
      track={track}
      tone={tone}
      {...FIT_SMALL}
      radius={FIT_RADIUS}
      vignette={{ x: 0.5, y: 1 }}
      style={styles.small}
    >
      <Label palette={palette}>{text.heart.title}</Label>
      <Value palette={palette} value={String(Math.round(toNumber(values.bpm)))} unit={text.heart.unit} />
      <View style={styles.fillCenter}>
        <HeartTrace palette={palette} width={140} height={46} />
      </View>
      <Caption palette={palette}>{text.heart.average(values.average)}</Caption>
    </WidgetSurface>
  );
}

// Three interlaced sine strands, like the pack's heart-rate trace.
function HeartTrace({ palette, width, height }: { palette: TonePalette; width: number; height: number }) {
  const strand = (phase: number, amplitude: number) => {
    let d = '';
    for (let x = 0; x <= width; x += 2) {
      const y = height / 2 + Math.sin((x / width) * Math.PI * 4 + phase) * amplitude;
      d += `${x === 0 ? 'M' : 'L'} ${x} ${y.toFixed(2)} `;
    }
    return d;
  };
  return (
    <Svg width={width} height={height}>
      <Path d={strand(0, height * 0.42)} stroke={palette.onSurface} strokeWidth={2.4} fill="none" />
      <Path
        d={strand(Math.PI / 1.5, height * 0.34)}
        stroke={palette.onSurface}
        strokeWidth={2}
        opacity={0.55}
        fill="none"
      />
      <Path
        d={strand(Math.PI * 1.3, height * 0.26)}
        stroke={palette.onSurface}
        strokeWidth={1.6}
        opacity={0.3}
        fill="none"
      />
    </Svg>
  );
}

export const WORKOUT_TIME_DEFAULTS = { time: '32:20' };

export function WorkoutTimeWidget(props: WidgetProps) {
  const { palette, track, tone, data } = useCard(props);
  const values = readData(WORKOUT_TIME_DEFAULTS, data);
  return (
    <WidgetSurface
      track={track}
      tone={tone}
      {...FIT_SMALL}
      radius={FIT_RADIUS}
      vignette={{ x: 0.5, y: 0.6 }}
      style={[styles.small, styles.centered]}
    >
      <IconBadge palette={palette}>
        <Barbell size={14} color={palette.onSurface} weight="bold" />
      </IconBadge>
      <View style={styles.centerStack}>
        <Text style={[styles.clock, { color: palette.onSurface }]} numberOfLines={1} adjustsFontSizeToFit>
          {values.time}
        </Text>
        <Caption palette={palette} style={styles.centerText}>
          {text.workoutTime.unit}
        </Caption>
      </View>
      <Label palette={palette} style={styles.centerText}>
        {text.workoutTime.title}
      </Label>
    </WidgetSurface>
  );
}

export const GOAL_RING_DEFAULTS = { value: '4', goal: '6', label: 'Cardio' };

export function GoalRingWidget(props: WidgetProps) {
  const { palette, track, tone, data } = useCard(props);
  const values = readData(GOAL_RING_DEFAULTS, data);
  const value = toNumber(values.value);
  const goal = Math.max(1, toNumber(values.goal, 1));
  return (
    <WidgetSurface
      track={track}
      tone={tone}
      {...FIT_SMALL}
      radius={FIT_RADIUS}
      vignette={{ x: 0.5, y: 0.5 }}
      style={[styles.small, styles.centered, styles.ringCard]}
    >
      <Ring palette={palette} size={140} stroke={14} progress={value / goal}>
        <Text style={[styles.ringValue, { color: palette.onSurface }]}>
          {thousands(value)}
          <Text style={[styles.ringGoal, { color: palette.onSurfaceMuted }]}>/{thousands(goal)}</Text>
        </Text>
        <Caption palette={palette}>{values.label}</Caption>
      </Ring>
    </WidgetSurface>
  );
}

export const STREAK_DEFAULTS = { days: '32', week: '5' };

export function StreakWidget(props: WidgetProps) {
  const { palette, track, tone, data } = useCard(props);
  const values = readData(STREAK_DEFAULTS, data);
  const days = Math.round(toNumber(values.days));
  const done = Math.min(7, Math.max(0, Math.round(toNumber(values.week))));
  return (
    <WidgetSurface
      track={track}
      tone={tone}
      {...FIT_SMALL}
      radius={FIT_RADIUS}
      vignette={{ x: 0, y: 0 }}
      style={[styles.small, styles.spread]}
    >
      <View style={styles.row}>
        <Fire size={30} color={palette.onSurface} weight="fill" />
        <View>
          <Caption palette={palette}>{text.streak.title.toUpperCase()}</Caption>
          <Value palette={palette} value={String(days)} unit={text.streak.days(days)} size={22} />
        </View>
      </View>
      <View style={styles.week}>
        {text.streak.week.map((day, index) => {
          const checked = index < done;
          return (
            <View key={index} style={styles.weekDay}>
              <View
                style={[
                  styles.weekDot,
                  checked
                    ? { backgroundColor: palette.onSurface }
                    : { borderColor: withAlpha(palette.onSurface, 0.35), borderWidth: 1.5 },
                ]}
              >
                {checked && (
                  <Svg width={10} height={10} viewBox="0 0 24 24">
                    <Path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      stroke={palette.isLightSurface ? '#FFFFFF' : '#000000'}
                      strokeWidth={3.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                )}
              </View>
              <Text style={[styles.weekLetter, { color: palette.onSurfaceMuted }]}>{day}</Text>
            </View>
          );
        })}
      </View>
      <ProgressBar palette={palette} progress={done / 7} height={6} />
    </WidgetSurface>
  );
}

export const CALORIES_DEFAULTS = { kcal: '180', goal: '600' };
const CALORIE_BARS = [3, 5, 2, 2, 2, 4, 7, 5, 3, 6, 9, 6, 11, 7, 5, 3, 2, 2, 2];

export function CaloriesWidget(props: WidgetProps) {
  const { palette, track, tone, data } = useCard(props);
  const values = readData(CALORIES_DEFAULTS, data);
  const progress = toNumber(values.kcal) / Math.max(1, toNumber(values.goal, 1));
  const lit = Math.round(clamp01(progress) * CALORIE_BARS.length);
  return (
    <WidgetSurface
      track={track}
      tone={tone}
      {...FIT_SMALL}
      radius={FIT_RADIUS}
      vignette={{ x: 1, y: 0 }}
      style={styles.small}
    >
      <Value palette={palette} value={thousands(toNumber(values.kcal))} unit={text.calories.unit} />
      <Caption palette={palette}>{text.calories.ofGoal(thousands(toNumber(values.goal)))}</Caption>
      <View style={styles.fillBottom}>
        <Bars
          palette={palette}
          values={CALORIE_BARS}
          width={140}
          height={58}
          gap={3}
          highlight={(index) => index < lit}
        />
      </View>
    </WidgetSurface>
  );
}

// ---------------------------------------------------------------------------------------------
// Small (tall)

export const DISTANCE_DEFAULTS = { km: '11.98', goal: '15' };

export function DistanceWidget(props: WidgetProps) {
  const { palette, track, tone, data } = useCard(props);
  const values = readData(DISTANCE_DEFAULTS, data);
  const km = toNumber(values.km);
  const progress = km / Math.max(0.1, toNumber(values.goal, 1));
  return (
    <WidgetSurface
      track={track}
      tone={tone}
      {...FIT_TALL}
      radius={FIT_RADIUS}
      vignette={{ x: 1, y: 0 }}
      style={styles.small}
    >
      <Label palette={palette}>{text.distance.title}</Label>
      <Caption palette={palette}>{text.distance.today}</Caption>
      <Value
        palette={palette}
        value={km.toFixed(2)}
        unit={text.distance.unit}
        size={34}
        style={styles.tight}
      />
      <View style={styles.fillCenter}>
        <RunTrack palette={palette} width={140} height={86} progress={progress} />
      </View>
    </WidgetSurface>
  );
}

// A running track (a stadium shape) drawn up to `progress`, with a dot where the runner is.
function RunTrack({
  palette,
  width,
  height,
  progress,
}: {
  palette: TonePalette;
  width: number;
  height: number;
  progress: number;
}) {
  const stroke = 5;
  const inset = stroke / 2 + 4;
  const w = width - inset * 2;
  const h = height - inset * 2;
  const r = Math.min(h / 2, 26);
  // Starts at the middle of the left side and runs clockwise.
  const d = [
    `M ${inset} ${inset + h / 2}`,
    `L ${inset} ${inset + r}`,
    `Q ${inset} ${inset} ${inset + r} ${inset}`,
    `L ${inset + w - r} ${inset}`,
    `Q ${inset + w} ${inset} ${inset + w} ${inset + r}`,
    `L ${inset + w} ${inset + h - r}`,
    `Q ${inset + w} ${inset + h} ${inset + w - r} ${inset + h}`,
    `L ${inset + r} ${inset + h}`,
    `Q ${inset} ${inset + h} ${inset} ${inset + h - r}`,
    'Z',
  ].join(' ');
  const perimeter = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r * 0.9;
  const shown = clamp01(progress);
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={withAlpha(palette.onSurface, 0.16)} strokeWidth={stroke} fill="none" />
      <Path
        d={d}
        stroke={palette.onSurface}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${perimeter * shown} ${perimeter}`}
        fill="none"
      />
      <Circle cx={inset} cy={inset + h / 2} r={6} fill={palette.onSurface} />
      <Circle cx={inset} cy={inset + h / 2} r={2.6} fill={palette.isLightSurface ? '#FFFFFF' : '#000000'} />
    </Svg>
  );
}

export const BALANCE_DEFAULTS = { left: '1707', eaten: '1230', burned: '233' };

export function BalanceWidget(props: WidgetProps) {
  const { palette, track, tone, data } = useCard(props);
  const values = readData(BALANCE_DEFAULTS, data);
  const left = toNumber(values.left);
  const eaten = toNumber(values.eaten);
  return (
    <WidgetSurface
      track={track}
      tone={tone}
      {...FIT_TALL}
      radius={FIT_RADIUS}
      vignette={{ x: 0.5, y: 0 }}
      style={styles.small}
    >
      <Label palette={palette}>{text.balance.title}</Label>
      <View style={styles.fillCenter}>
        <Ring palette={palette} size={120} stroke={11} progress={eaten / Math.max(1, eaten + left)}>
          <Text style={[styles.ringValue, { color: palette.onSurface }]}>{thousands(left)}</Text>
          <Caption palette={palette}>{text.balance.left}</Caption>
        </Ring>
      </View>
      <View style={styles.statsRow}>
        <Stat palette={palette} value={thousands(eaten)} caption={text.balance.eaten} />
        <Stat palette={palette} value={thousands(toNumber(values.burned))} caption={text.balance.burned} />
      </View>
    </WidgetSurface>
  );
}

// ---------------------------------------------------------------------------------------------
// Medium (wide)

export const WALK_DEFAULTS = { steps: '4123', goal: '6000', bpm: '87' };

export function WalkWidget(props: WidgetProps) {
  const { palette, track, tone, data } = useCard(props);
  const values = readData(WALK_DEFAULTS, data);
  const steps = toNumber(values.steps);
  return (
    <WidgetSurface
      track={track}
      tone={tone}
      {...FIT_MEDIUM}
      radius={FIT_RADIUS}
      vignette={{ x: 0.5, y: 0 }}
      style={[styles.medium, styles.spread]}
    >
      <View style={styles.row}>
        <Footprints size={20} color={palette.onSurface} weight="fill" />
        <Label palette={palette}>{text.walk.title}</Label>
      </View>
      <ProgressBar palette={palette} progress={steps / Math.max(1, toNumber(values.goal, 1))} height={30} />
      <View style={styles.bottomRow}>
        <Value palette={palette} value={thousands(steps)} unit={text.walk.unit} size={42} />
        <View style={styles.row}>
          <Heart size={16} color={palette.onSurfaceMuted} weight="fill" />
          <Text style={[styles.inlineStat, { color: palette.onSurfaceMuted }]}>
            {text.walk.bpm(values.bpm)}
          </Text>
        </View>
      </View>
    </WidgetSurface>
  );
}

export const ACTIVE_TIME_DEFAULTS = { time: '1h 12m' };
const ACTIVE_BARS = [2, 1, 1, 1, 3, 8, 12, 7, 4, 9, 13, 10, 5, 3, 6, 11, 14, 9, 6, 4, 2, 1, 1, 1];

export function ActiveTimeWidget(props: WidgetProps) {
  const { palette, track, tone, data } = useCard(props);
  const values = readData(ACTIVE_TIME_DEFAULTS, data);
  return (
    <WidgetSurface
      track={track}
      tone={tone}
      {...FIT_MEDIUM}
      radius={FIT_RADIUS}
      vignette={{ x: 0.5, y: 1 }}
      style={styles.medium}
    >
      <View style={styles.headerRow}>
        <View style={styles.row}>
          <Clock size={18} color={palette.onSurface} weight="bold" />
          <Label palette={palette}>{text.activeTime.title}</Label>
        </View>
        <Value palette={palette} value={values.time} size={22} />
      </View>
      <View style={styles.fillBottom}>
        <Bars palette={palette} values={ACTIVE_BARS} width={FIT_MEDIUM_CONTENT} height={78} gap={5} />
        <View style={styles.axis}>
          {text.activeTime.hours.map((hour) => (
            <Caption key={hour} palette={palette}>
              {hour}
            </Caption>
          ))}
        </View>
      </View>
    </WidgetSurface>
  );
}

export const WEEKLY_DEFAULTS = { value: '37', goal: '150', unit: 'min', range: '11 – 17 mar' };

export function WeeklyTargetWidget(props: WidgetProps) {
  const { palette, track, tone, data } = useCard(props);
  const values = readData(WEEKLY_DEFAULTS, data);
  const value = toNumber(values.value);
  return (
    <WidgetSurface
      track={track}
      tone={tone}
      {...FIT_MEDIUM}
      radius={FIT_RADIUS}
      vignette={{ x: 0, y: 0 }}
      style={[styles.medium, styles.spread]}
    >
      <View style={styles.headerRow}>
        <Label palette={palette}>{text.weekly.title}</Label>
        <Caption palette={palette}>{values.range}</Caption>
      </View>
      <Text style={[styles.bigLine, { color: palette.onSurface }]} numberOfLines={1}>
        {thousands(value)}
        <Text style={[styles.bigLineUnit, { color: palette.onSurfaceMuted }]}>
          {`  ${text.weekly.of(thousands(toNumber(values.goal)), values.unit)}`}
        </Text>
      </Text>
      <ProgressBar
        palette={palette}
        progress={value / Math.max(1, toNumber(values.goal, 1))}
        height={16}
        knob
        style={styles.knobBar}
      />
    </WidgetSurface>
  );
}

export const HEART_ZONE_DEFAULTS = { now: '142', resting: '60', average: '102', max: '220' };

export function HeartZoneWidget(props: WidgetProps) {
  const { palette, track, tone, data } = useCard(props);
  const values = readData(HEART_ZONE_DEFAULTS, data);
  const resting = toNumber(values.resting);
  const max = Math.max(resting + 1, toNumber(values.max));
  const position = (toNumber(values.now) - resting) / (max - resting);
  return (
    <WidgetSurface
      track={track}
      tone={tone}
      {...FIT_MEDIUM}
      radius={FIT_RADIUS}
      vignette={{ x: 0.5, y: 0 }}
      style={[styles.medium, styles.spread]}
    >
      <View style={styles.row}>
        <Heartbeat size={20} color={palette.onSurface} weight="bold" />
        <Label palette={palette}>{text.heartZone.title}</Label>
      </View>
      <ZoneBar palette={palette} position={position} />
      <View style={styles.statsRow}>
        <Stat palette={palette} value={values.resting} caption={text.heartZone.resting} />
        <Stat palette={palette} value={values.average} caption={text.heartZone.average} />
        <Stat palette={palette} value={values.now} caption={text.heartZone.now} />
        <Stat palette={palette} value={values.max} caption={text.heartZone.max} />
      </View>
    </WidgetSurface>
  );
}

// The bpm range as a bar that deepens toward the maximum, with a knob at the current value.
function ZoneBar({ palette, position }: { palette: TonePalette; position: number }) {
  const width = FIT_MEDIUM_CONTENT;
  const height = 22;
  const knobX = 11 + clamp01(position) * (width - 22);
  return (
    <Svg width={width} height={height + 8}>
      <Defs>
        <LinearGradient id="zone" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={palette.onSurface} stopOpacity={0.12} />
          <Stop offset="1" stopColor={palette.onSurface} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={4} width={width} height={height} rx={height / 2} fill="url(#zone)" />
      <Circle
        cx={knobX}
        cy={4 + height / 2}
        r={height / 2 + 2}
        fill={palette.isLightSurface ? '#FFFFFF' : '#000000'}
        stroke={palette.onSurface}
        strokeWidth={3}
      />
    </Svg>
  );
}

export const RUN_DEFAULTS = { steps: '4200', goal: '10000', duration: '3h 19m', distance: '14', kcal: '988' };

export function RunSummaryWidget(props: WidgetProps) {
  const { palette, track, tone, data } = useCard(props);
  const values = readData(RUN_DEFAULTS, data);
  const steps = toNumber(values.steps);
  const goal = Math.max(1, toNumber(values.goal, 1));
  return (
    <WidgetSurface
      track={track}
      tone={tone}
      {...FIT_MEDIUM}
      radius={FIT_RADIUS}
      vignette={{ x: 1, y: 1 }}
      style={styles.medium}
    >
      <View style={styles.headerRow}>
        <View style={styles.row}>
          <Lightning size={18} color={palette.onSurface} weight="fill" />
          <Label palette={palette}>{text.run.title}</Label>
        </View>
        <Caption palette={palette}>{text.run.goal(thousands(goal))}</Caption>
      </View>
      <View style={styles.runBody}>
        <Ring palette={palette} size={98} stroke={9} progress={steps / goal}>
          <Text style={[styles.runSteps, { color: palette.onSurface }]}>{thousands(steps)}</Text>
          <Caption palette={palette}>{text.run.unit}</Caption>
        </Ring>
        <View style={styles.runStats}>
          <RunRow palette={palette} caption={text.run.duration} value={values.duration} />
          <RunRow palette={palette} caption={text.run.distance} value={values.distance} unit="km" />
          <RunRow
            palette={palette}
            caption={text.run.calories}
            value={thousands(toNumber(values.kcal))}
            unit="kcal"
            last
          />
        </View>
      </View>
    </WidgetSurface>
  );
}

// "Duración ···· 3h 19m": the caption on the left, the value on the right, a hairline between rows.
function RunRow({
  palette,
  caption,
  value,
  unit,
  last = false,
}: {
  palette: TonePalette;
  caption: string;
  value: string;
  unit?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.runRow, !last && { borderBottomColor: palette.hairline, borderBottomWidth: 1 }]}>
      <Caption palette={palette} style={styles.runCaption}>
        {caption}
      </Caption>
      <Value palette={palette} value={value} unit={unit} size={17} />
    </View>
  );
}

function IconBadge({ palette, children }: { palette: TonePalette; children: ReactNode }) {
  return (
    <View style={[styles.iconBadge, { backgroundColor: withAlpha(palette.onSurface, 0.14) }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  small: { padding: 14, gap: 2 },
  medium: { paddingHorizontal: 18, paddingVertical: 16, gap: 8 },
  centered: { alignItems: 'center', justifyContent: 'space-between' },
  spread: { justifyContent: 'space-between' },
  ringCard: { justifyContent: 'center', padding: 8 },
  tight: { marginTop: 2 },
  fillBottom: { flex: 1, justifyContent: 'flex-end' },
  fillCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerStack: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  clock: { fontSize: 42, fontWeight: '600', letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  ringValue: { fontSize: 26, fontWeight: '700', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  ringGoal: { fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 4 },
  weekDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  weekLetter: { fontSize: 10, fontWeight: '600' },
  inlineStat: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  bigLine: { fontSize: 42, fontWeight: '600', letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  bigLineUnit: { fontSize: 16, fontWeight: '500', letterSpacing: -0.2 },
  knobBar: { marginBottom: 6 },
  runBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 18 },
  runStats: { flex: 1, justifyContent: 'center' },
  runRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  runCaption: { fontSize: 13 },
  runSteps: { fontSize: 20, fontWeight: '700', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  iconBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
