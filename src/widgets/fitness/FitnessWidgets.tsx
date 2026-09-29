import { StyleSheet, Text, View } from 'react-native';
import { Lightning } from 'phosphor-react-native/src/icons/Lightning';
import { strings } from '@/i18n/es';
import { getTonePalette, type TonePalette } from '../tonePalette';
import { readData, toNumber, type WidgetProps } from '../types';
import { WidgetSurface } from '../WidgetSurface';
import { Caption, FIT_MEDIUM, FIT_RADIUS, Label, Ring, thousands, Value } from './parts';

const text = strings.widgets.fitness;

function useCard({ track, tone, data }: WidgetProps) {
  return { palette: getTonePalette(tone, track.accentColor), track, tone, data };
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

const styles = StyleSheet.create({
  medium: { paddingHorizontal: 18, paddingVertical: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
});
