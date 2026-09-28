import { strings } from '@/i18n/es';
import { fields } from './fields';
import {
  ACTIVE_TIME_DEFAULTS,
  ActiveTimeWidget,
  BALANCE_DEFAULTS,
  BalanceWidget,
  CALORIES_DEFAULTS,
  CaloriesWidget,
  DISTANCE_DEFAULTS,
  DistanceWidget,
  GOAL_RING_DEFAULTS,
  GoalRingWidget,
  HEART_DEFAULTS,
  HEART_ZONE_DEFAULTS,
  HeartWidget,
  HeartZoneWidget,
  RUN_DEFAULTS,
  RunSummaryWidget,
  STEPS_DEFAULTS,
  StepsWidget,
  STREAK_DEFAULTS,
  StreakWidget,
  WALK_DEFAULTS,
  WalkWidget,
  WEEKLY_DEFAULTS,
  WeeklyTargetWidget,
  WORKOUT_TIME_DEFAULTS,
  WorkoutTimeWidget,
} from './fitness/FitnessWidgets';
import { FIT_MEDIUM, FIT_SMALL, FIT_TALL } from './fitness/parts';
import {
  AIRPODS_DEFAULTS,
  ISLAND_COMPACT,
  ISLAND_EXPANDED,
  IslandAirPodsWidget,
  IslandMusicWidget,
  IslandNowPlayingWidget,
  IslandTimerWidget,
  TIMER_DEFAULTS,
} from './island/IslandWidgets';
import { MATCH_DEFAULTS, MATCH_SIZE, MatchWidget } from './MatchWidget';
import { PLAYER_SIZE, PlayerWidget } from './PlayerWidget';
import type { WidgetCategory, WidgetConfig, WidgetData, WidgetDefinition, WidgetField } from './types';
import { WEATHER_CARD_DEFAULTS, WEATHER_CARD_SIZE, WeatherCardWidget } from './WeatherCardWidget';
import { WEATHER_DEFAULTS, WEATHER_SIZE, WeatherWidget } from './WeatherWidget';

// The sky is picked from the drawn conditions rather than typed.
const withSkyChoice = (list: WidgetField[]): WidgetField[] =>
  list.map((field) =>
    field.key === 'condition'
      ? {
          ...field,
          kind: 'choice',
          choices: Object.entries(strings.widgets.weather.conditions).map(([id, label]) => ({ id, label })),
        }
      : field,
  );

const weatherFields = withSkyChoice(fields(strings.widgets.weather.fields, ['temp', 'high', 'low']));
const weatherCardFields = withSkyChoice(fields(strings.widgets.weatherCard.fields, ['temp', 'wind']));

const { fitness, island } = strings.widgets;

// Every fitness widget works the same way: Pro, editable numbers, any tone.
function fitnessWidget(
  id: string,
  copy: { name: string; fields: Record<string, string> },
  defaults: WidgetData,
  numeric: string[],
  size: { width: number; height: number },
  Component: WidgetDefinition['Component'],
): WidgetDefinition {
  return {
    id,
    name: copy.name,
    category: 'fitness',
    options: ['content', 'tone'],
    fields: fields(copy.fields, numeric),
    defaults,
    pro: true,
    isNew: true,
    ...size,
    Component,
  };
}

// Adding a widget = one component file + one entry here. The library, the quick tray and the
// Ajustes panel all read from this list, so nothing else in the editor needs to change.
export const WIDGETS: WidgetDefinition[] = [
  {
    id: 'player',
    name: strings.widgets.player,
    category: 'music',
    options: ['tone', 'device', 'progress', 'cover', 'times'],
    ...PLAYER_SIZE,
    Component: PlayerWidget,
  },
  // Dynamic Island: always black, like the real one, so no tone to pick.
  {
    id: 'islandNowPlaying',
    name: island.nowPlaying.name,
    category: 'island',
    options: ['progress'],
    isNew: true,
    ...ISLAND_EXPANDED,
    Component: IslandNowPlayingWidget,
  },
  {
    id: 'islandMusic',
    name: island.music.name,
    category: 'island',
    options: [],
    isNew: true,
    ...ISLAND_COMPACT,
    Component: IslandMusicWidget,
  },
  {
    id: 'islandAirPods',
    name: island.airpods.name,
    category: 'island',
    options: ['content'],
    fields: fields(island.airpods.fields, ['battery']),
    defaults: AIRPODS_DEFAULTS,
    isNew: true,
    ...ISLAND_COMPACT,
    Component: IslandAirPodsWidget,
  },
  {
    id: 'islandTimer',
    name: island.timer.name,
    category: 'island',
    options: ['content'],
    fields: fields(island.timer.fields),
    defaults: TIMER_DEFAULTS,
    pro: true,
    isNew: true,
    ...ISLAND_COMPACT,
    Component: IslandTimerWidget,
  },
  // Fitness: the numbers are typed in (from the watch or the fitness app), in any of the tones.
  fitnessWidget('fitSteps', fitness.steps, STEPS_DEFAULTS, ['steps'], FIT_SMALL, StepsWidget),
  fitnessWidget('fitHeart', fitness.heart, HEART_DEFAULTS, ['bpm', 'average'], FIT_SMALL, HeartWidget),
  fitnessWidget(
    'fitWorkoutTime',
    fitness.workoutTime,
    WORKOUT_TIME_DEFAULTS,
    [],
    FIT_SMALL,
    WorkoutTimeWidget,
  ),
  fitnessWidget(
    'fitGoalRing',
    fitness.goalRing,
    GOAL_RING_DEFAULTS,
    ['value', 'goal'],
    FIT_SMALL,
    GoalRingWidget,
  ),
  fitnessWidget('fitStreak', fitness.streak, STREAK_DEFAULTS, ['days', 'week'], FIT_SMALL, StreakWidget),
  fitnessWidget(
    'fitCalories',
    fitness.calories,
    CALORIES_DEFAULTS,
    ['kcal', 'goal'],
    FIT_SMALL,
    CaloriesWidget,
  ),
  fitnessWidget('fitDistance', fitness.distance, DISTANCE_DEFAULTS, ['km', 'goal'], FIT_TALL, DistanceWidget),
  fitnessWidget(
    'fitBalance',
    fitness.balance,
    BALANCE_DEFAULTS,
    ['left', 'eaten', 'burned'],
    FIT_TALL,
    BalanceWidget,
  ),
  fitnessWidget('fitWalk', fitness.walk, WALK_DEFAULTS, ['steps', 'goal', 'bpm'], FIT_MEDIUM, WalkWidget),
  fitnessWidget('fitActiveTime', fitness.activeTime, ACTIVE_TIME_DEFAULTS, [], FIT_MEDIUM, ActiveTimeWidget),
  fitnessWidget(
    'fitWeekly',
    fitness.weekly,
    WEEKLY_DEFAULTS,
    ['value', 'goal'],
    FIT_MEDIUM,
    WeeklyTargetWidget,
  ),
  fitnessWidget(
    'fitHeartZone',
    fitness.heartZone,
    HEART_ZONE_DEFAULTS,
    ['now', 'resting', 'average', 'max'],
    FIT_MEDIUM,
    HeartZoneWidget,
  ),
  fitnessWidget(
    'fitRun',
    fitness.run,
    RUN_DEFAULTS,
    ['steps', 'goal', 'distance', 'kcal'],
    FIT_MEDIUM,
    RunSummaryWidget,
  ),
  {
    id: 'weather',
    name: strings.widgets.weather.name,
    category: 'weather',
    options: ['content', 'tone'],
    fields: weatherFields,
    defaults: WEATHER_DEFAULTS,
    live: 'weather',
    pro: true,
    isNew: true,
    ...WEATHER_SIZE,
    Component: WeatherWidget,
  },
  {
    id: 'weatherCard',
    name: strings.widgets.weatherCard.name,
    category: 'weather',
    options: ['content', 'tone'],
    fields: weatherCardFields,
    defaults: WEATHER_CARD_DEFAULTS,
    live: 'weather',
    pro: true,
    isNew: true,
    ...WEATHER_CARD_SIZE,
    Component: WeatherCardWidget,
  },
  {
    id: 'match',
    name: strings.widgets.match.name,
    category: 'sports',
    options: ['content', 'tone'],
    fields: fields(strings.widgets.match.fields, ['homeScore', 'awayScore']),
    defaults: MATCH_DEFAULTS,
    live: 'football',
    pro: true,
    isNew: true,
    ...MATCH_SIZE,
    Component: MatchWidget,
  },
];

export const WIDGET_CATEGORIES: { id: WidgetCategory; label: string }[] = (
  ['music', 'island', 'fitness', 'weather', 'sports'] as const
).map((id) => ({ id, label: strings.widgets.categories[id] }));

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  tone: 'glass',
  device: null,
  progress: 0.42,
  showCover: true,
  showTimes: true,
  content: {},
};

const defaultConfigs = new Map<string, WidgetConfig>();

// One shared object per widget, so memoized previews of unconfigured widgets see the same config
// on every editor render. Callers spread it before changing anything; never mutate it.
export function defaultConfigFor(widget: WidgetDefinition): WidgetConfig {
  let config = defaultConfigs.get(widget.id);
  if (!config) {
    config = { ...DEFAULT_WIDGET_CONFIG, content: { ...widget.defaults } };
    defaultConfigs.set(widget.id, config);
  }
  return config;
}

export function findWidget(id: string): WidgetDefinition {
  return WIDGETS.find((widget) => widget.id === id) ?? WIDGETS[0];
}
