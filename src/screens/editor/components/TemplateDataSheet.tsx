import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { GalleryIcon } from '@/components/Icons';
import { strings } from '@/i18n/es';
import type { TemplateContent } from '@/templates/types';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import {
  AUDIO_DEVICES,
  AudioDeviceIcon,
  BluetoothOutputIcon,
  type AudioDevice,
} from '@/widgets/AudioDeviceIcon';

type Props = {
  visible: boolean;
  name: string;
  content: TemplateContent;
  onChange: (patch: Partial<TemplateContent>) => void;
  onPickCover: () => void;
  onClose: () => void;
};

const text = strings.templates.edit;

export function TemplateDataSheet({ visible, name, content, onChange, onPickCover, onClose }: Props) {
  const window = useWindowDimensions();

  return (
    <BottomSheet visible={visible} onClose={onClose} tone="dark">
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>{text.title(name)}</Text>
          <Text style={styles.subtitle}>{text.subtitle}</Text>
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
        style={{ maxHeight: window.height * 0.5 }}
        contentContainerStyle={styles.fields}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.coverRow}>
          <Image source={{ uri: content.coverUri }} style={styles.cover} />
          <View style={styles.flex}>
            <Text style={styles.label}>{text.cover}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onPickCover}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <GalleryIcon size={16} color={editorColors.text} />
              <Text style={styles.chipText}>{text.changeCover}</Text>
            </Pressable>
          </View>
        </View>

        <Field label={text.song} value={content.title} onChange={(title) => onChange({ title })} />
        <Field label={text.artist} value={content.artist} onChange={(artist) => onChange({ artist })} />
        <Field label={text.owner} value={content.owner} onChange={(owner) => onChange({ owner })} />

        <View style={styles.field}>
          <Text style={styles.label}>{text.device}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.choices}
          >
            <DeviceChip
              device={null}
              name={strings.editor.deviceBluetooth}
              active={content.device === null}
              onPress={() => onChange({ device: null })}
            />
            {AUDIO_DEVICES.map(({ id, name: deviceName }) => (
              <DeviceChip
                key={id}
                device={id}
                name={deviceName}
                active={content.device === id}
                onPress={() => onChange({ device: id })}
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function DeviceChip({
  device,
  name,
  active,
  onPress,
}: {
  device: AudioDevice | null;
  name: string;
  active: boolean;
  onPress: () => void;
}) {
  const color = active ? editorColors.background : editorColors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.editor.deviceOption(name)}
      aria-selected={active}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      {device ? (
        <AudioDeviceIcon device={device} size={16} color={color} />
      ) : (
        <BluetoothOutputIcon size={16} color={color} />
      )}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{name}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        maxLength={60}
        autoCorrect={false}
        returnKeyType="done"
        accessibilityLabel={label}
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
  coverRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cover: { width: 64, height: 64, borderRadius: 12, backgroundColor: editorColors.surfaceRaised },
  field: { gap: 6 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: editorColors.textMuted, marginBottom: 6 },
  input: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: editorColors.surfaceRaised,
    color: editorColors.text,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
  },
  choices: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: editorColors.surfaceRaised,
  },
  chipActive: { backgroundColor: editorColors.text },
  chipText: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: editorColors.text },
  chipTextActive: { color: editorColors.background },
});
