import { Pressable, StyleSheet, Text, View } from 'react-native';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { getTonePalette } from '@/widgets/tonePalette';
import type { WidgetTone } from '@/widgets/types';
import { WIDGET_TONES } from '../editorTools';
import { Tray } from './Tray';

type Props = {
  accentColor: string | null;
  selected: WidgetTone;
  onSelect: (tone: WidgetTone) => void;
};

export function ToneTray({ accentColor, selected, onSelect }: Props) {
  return (
    <Tray>
      {WIDGET_TONES.map(({ id, label }) => {
        const palette = getTonePalette(id, accentColor);
        const active = id === selected;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => onSelect(id)}
            style={[styles.chip, active && styles.active]}
          >
            <View
              style={[
                styles.dot,
                id === 'glass'
                  ? styles.glassDot
                  : { backgroundColor: palette.surface, borderColor: palette.hairline },
              ]}
            />
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </Tray>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: editorColors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  active: { borderColor: editorColors.accent },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1 },
  glassDot: { backgroundColor: 'rgba(255, 255, 255, 0.28)', borderColor: 'rgba(255, 255, 255, 0.7)' },
  label: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.6, color: editorColors.textMuted },
  labelActive: { color: editorColors.text },
});
