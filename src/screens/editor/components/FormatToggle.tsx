import { Pressable, StyleSheet, Text, View } from 'react-native';
import { strings } from '@/i18n/es';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import type { ExportFormat } from '../hooks/useStoryExport';

type Props = {
  value: ExportFormat;
  disabled: boolean;
  onChange: (format: ExportFormat) => void;
};

const FORMATS: ExportFormat[] = ['photo', 'video'];

// Camera-style switch above the shutter: share a still with a movable sticker, or a 4K video.
export function FormatToggle({ value, disabled, onChange }: Props) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {FORMATS.map((format) => {
        const active = format === value;
        return (
          <Pressable
            key={format}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled }}
            disabled={disabled}
            onPress={() => onChange(format)}
            hitSlop={6}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{strings.editor.format[format]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignSelf: 'center', gap: 4, marginTop: 10 },
  option: { paddingHorizontal: 14, height: 28, borderRadius: 14, justifyContent: 'center' },
  optionActive: { backgroundColor: editorColors.surfaceRaised },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    letterSpacing: 0.4,
    color: editorColors.textFaint,
  },
  labelActive: { color: editorColors.accent },
});
