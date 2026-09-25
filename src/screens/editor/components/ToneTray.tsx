import { Pressable, StyleSheet, View } from 'react-native';
import { editorColors } from '@/theme/colors';
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
          </Pressable>
        );
      })}
    </Tray>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: editorColors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  active: { borderColor: editorColors.accent },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1 },
  glassDot: { backgroundColor: 'rgba(255, 255, 255, 0.28)', borderColor: 'rgba(255, 255, 255, 0.7)' },
});
