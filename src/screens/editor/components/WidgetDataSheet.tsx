import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { strings } from '@/i18n/es';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import type { WidgetData, WidgetDefinition, WidgetField } from '@/widgets/types';
import { WidgetLiveSection } from './WidgetLiveSection';

type Props = {
  visible: boolean;
  widget: WidgetDefinition;
  content: WidgetData;
  onChange: (key: string, value: string) => void;
  onFill: (patch: WidgetData) => void;
  onClose: () => void;
};

// Typed-in values that are still blank fall back to the widget's defaults.
function nonEmpty(content: WidgetData): WidgetData {
  return Object.fromEntries(Object.entries(content).filter(([, value]) => value.trim() !== ''));
}

export function WidgetDataSheet({ visible, widget, content, onChange, onFill, onClose }: Props) {
  const window = useWindowDimensions();
  const fields = widget.fields ?? [];

  return (
    <BottomSheet visible={visible} onClose={onClose} tone="dark">
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>{strings.widgets.data.title}</Text>
          <Text style={styles.subtitle}>{strings.widgets.data.subtitle}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.done, pressed && styles.pressed]}
        >
          <Text style={styles.doneText}>{strings.widgets.data.done}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ maxHeight: window.height * 0.42 }}
        contentContainerStyle={styles.fields}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {widget.live && (
          <WidgetLiveSection
            source={widget.live}
            values={{ ...widget.defaults, ...nonEmpty(content) }}
            onFill={onFill}
          />
        )}
        {fields.map((field) => (
          <Field
            key={field.key}
            field={field}
            value={content[field.key] ?? ''}
            placeholder={widget.defaults?.[field.key]}
            onChange={(value) => onChange(field.key, value)}
          />
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

function Field({
  field,
  value,
  placeholder,
  onChange,
}: {
  field: WidgetField;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  if (field.kind === 'choice') {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{field.label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
          {field.choices?.map((choice) => {
            const active = choice.id === (value || placeholder);
            return (
              <Pressable
                key={choice.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => onChange(choice.id)}
                style={[styles.choice, active && styles.choiceActive]}
              >
                <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{choice.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{field.label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={editorColors.textFaint}
        keyboardType={field.kind === 'number' ? 'numbers-and-punctuation' : 'default'}
        maxLength={field.maxLength ?? 40}
        autoCorrect={false}
        returnKeyType="done"
        accessibilityLabel={field.label}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  flex: { flex: 1 },
  title: { fontFamily: fonts.sansExtraBold, fontSize: 24, letterSpacing: -0.6, color: editorColors.text },
  subtitle: { fontFamily: fonts.sansMedium, fontSize: 14, color: editorColors.textMuted, marginTop: 2 },
  done: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: editorColors.accent,
    justifyContent: 'center',
  },
  doneText: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: editorColors.onAccent },
  pressed: { opacity: 0.7 },
  fields: { gap: 14, paddingBottom: 8 },
  field: { gap: 6 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: editorColors.textMuted },
  input: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: editorColors.surfaceRaised,
    color: editorColors.text,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
  },
  choices: { gap: 8 },
  choice: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: editorColors.surfaceRaised,
    justifyContent: 'center',
  },
  choiceActive: { backgroundColor: editorColors.text },
  choiceText: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: editorColors.textMuted },
  choiceTextActive: { color: editorColors.background },
});
