import { useState, type ComponentType, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ClockIcon,
  EyeIcon,
  GalleryIcon,
  HeadphonesIcon,
  PencilIcon,
  TimerIcon,
  ToneIcon,
  type IconProps,
} from '@/components/Icons';
import { Slider } from '@/components/Slider';
import { strings } from '@/i18n/es';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import type { TrackMetadata } from '@/types/music';
import { formatDuration } from '@/utils/time';
import { AUDIO_DEVICES, AudioDeviceIcon, BluetoothOutputIcon } from '@/widgets/AudioDeviceIcon';
import { getTonePalette } from '@/widgets/tonePalette';
import { ToneFill } from '@/widgets/ToneFill';
import type { WidgetConfig, WidgetDefinition, WidgetOption } from '@/widgets/types';
import { WIDGET_TONES } from '../editorTools';
import { Tray } from './Tray';

type Props = {
  widget: WidgetDefinition;
  track: TrackMetadata;
  config: WidgetConfig;
  onChange: (patch: Partial<WidgetConfig>) => void;
  onEditContent: () => void;
};

type Section = 'content' | 'tone' | 'device' | 'progress' | 'show';

// Icon-only tabs: text labels got clipped on device, and the icons read faster anyway.
const SECTIONS: Record<Section, { label: string; Icon: ComponentType<IconProps> }> = {
  content: { label: strings.editor.customize.content, Icon: PencilIcon },
  tone: { label: strings.editor.customize.tone, Icon: ToneIcon },
  device: { label: strings.editor.customize.device, Icon: HeadphonesIcon },
  progress: { label: strings.editor.customize.progress, Icon: TimerIcon },
  show: { label: strings.editor.customize.show, Icon: EyeIcon },
};

const OPTION_SECTION: Record<WidgetOption, Section> = {
  content: 'content',
  tone: 'tone',
  device: 'device',
  progress: 'progress',
  cover: 'show',
  times: 'show',
};

const FALLBACK_DURATION_MS = 200000;
const CIRCLE = 42;

export function CustomizePanel({ widget, track, config, onChange, onEditContent }: Props) {
  const sections = [...new Set(widget.options.map((option) => OPTION_SECTION[option]))];
  const [picked, setPicked] = useState<Section>(sections[0]);
  // A widget switch can drop the open section (e.g. Mini has no device), so fall back to the first one.
  const section = sections.includes(picked) ? picked : sections[0];

  return (
    <Tray scroll={false}>
      <View style={styles.body}>
        {section === 'content' && <ContentSection widget={widget} config={config} onEdit={onEditContent} />}
        {section === 'tone' && <ToneSection track={track} config={config} onChange={onChange} />}
        {section === 'device' && <DeviceSection config={config} onChange={onChange} />}
        {section === 'progress' && <ProgressSection track={track} config={config} onChange={onChange} />}
        {section === 'show' && <ShowSection widget={widget} config={config} onChange={onChange} />}
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {sections.map((id) => {
          const active = id === section;
          const { label, Icon } = SECTIONS[id];
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              onPress={() => setPicked(id)}
              hitSlop={6}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Icon size={20} color={active ? editorColors.text : editorColors.textFaint} />
            </Pressable>
          );
        })}
      </View>
    </Tray>
  );
}

type SectionProps = { config: WidgetConfig; onChange: (patch: Partial<WidgetConfig>) => void };

function ContentSection({
  widget,
  config,
  onEdit,
}: {
  widget: WidgetDefinition;
  config: WidgetConfig;
  onEdit: () => void;
}) {
  const summary = (widget.fields ?? [])
    .filter((field) => field.kind !== 'choice')
    .map((field) => config.content[field.key]?.trim() || widget.defaults?.[field.key])
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ');
  return (
    <View style={styles.content}>
      <Text style={styles.summary} numberOfLines={1}>
        {summary}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onEdit}
        style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
      >
        <PencilIcon size={16} color={editorColors.onAccent} />
        <Text style={styles.editText}>{strings.widgets.data.edit}</Text>
      </Pressable>
    </View>
  );
}

function ToneSection({ track, config, onChange }: SectionProps & { track: TrackMetadata }) {
  return (
    <OptionRow>
      {WIDGET_TONES.map(({ id, label }) => {
        const palette = getTonePalette(id, track.accentColor);
        return (
          <CircleOption
            key={id}
            label={label}
            active={config.tone === id}
            onPress={() => onChange({ tone: id })}
          >
            <View
              style={[styles.swatch, id === 'glass' ? styles.glassSwatch : { borderColor: palette.hairline }]}
            >
              {id !== 'glass' && <ToneFill palette={palette} id={`swatch-${id}`} />}
            </View>
          </CircleOption>
        );
      })}
    </OptionRow>
  );
}

function DeviceSection({ config, onChange }: SectionProps) {
  return (
    <OptionRow>
      <CircleOption
        label={strings.editor.deviceBluetooth}
        accessibilityLabel={strings.editor.deviceOption(strings.editor.deviceBluetooth)}
        active={config.device === null}
        onPress={() => onChange({ device: null })}
      >
        <BluetoothOutputIcon color={editorColors.text} size={16} />
      </CircleOption>
      {AUDIO_DEVICES.map(({ id, name, short }) => (
        <CircleOption
          key={id}
          label={short}
          accessibilityLabel={strings.editor.deviceOption(name)}
          active={config.device === id}
          onPress={() => onChange({ device: id })}
        >
          <AudioDeviceIcon device={id} color={editorColors.text} size={20} />
        </CircleOption>
      ))}
    </OptionRow>
  );
}

function ProgressSection({ track, config, onChange }: SectionProps & { track: TrackMetadata }) {
  const durationMs = track.durationMs ?? FALLBACK_DURATION_MS;
  return (
    <View style={styles.progress}>
      <Text style={styles.progressValue}>{formatDuration(durationMs * config.progress)}</Text>
      <View style={styles.flex}>
        <Slider
          value={config.progress}
          onChange={(progress) => onChange({ progress })}
          accessibilityLabel={strings.editor.customize.progressLabel}
        />
      </View>
      <Text style={styles.progressValue}>{formatDuration(durationMs)}</Text>
    </View>
  );
}

function ShowSection({ widget, config, onChange }: SectionProps & { widget: WidgetDefinition }) {
  const toggles: {
    option: WidgetOption;
    label: string;
    Icon: ComponentType<IconProps>;
    value: boolean;
    patch: Partial<WidgetConfig>;
  }[] = [
    {
      option: 'cover',
      label: strings.editor.customize.cover,
      Icon: GalleryIcon,
      value: config.showCover,
      patch: { showCover: !config.showCover },
    },
    {
      option: 'times',
      label: strings.editor.customize.times,
      Icon: ClockIcon,
      value: config.showTimes,
      patch: { showTimes: !config.showTimes },
    },
  ];
  return (
    <View style={styles.toggles}>
      {toggles
        .filter(({ option }) => widget.options.includes(option))
        .map(({ option, label, Icon, value, patch }) => (
          <Pressable
            key={option}
            accessibilityRole="switch"
            accessibilityLabel={label}
            accessibilityState={{ checked: value }}
            onPress={() => onChange(patch)}
            style={({ pressed }) => [styles.circle, value && styles.circleActive, pressed && styles.pressed]}
          >
            <Icon size={20} color={value ? editorColors.text : editorColors.textFaint} />
            {!value && <View style={styles.strike} />}
          </Pressable>
        ))}
    </View>
  );
}

function OptionRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {children}
    </ScrollView>
  );
}

function CircleOption({
  label,
  accessibilityLabel,
  active,
  onPress,
  children,
}: {
  label: string;
  accessibilityLabel?: string;
  active: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <View style={[styles.circle, active && styles.circleActive]}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { height: 64, justifyContent: 'center' },
  row: { paddingHorizontal: 14, gap: 10, alignItems: 'center' },
  option: { alignItems: 'center' },
  pressed: { opacity: 0.6 },
  flex: { flex: 1 },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: editorColors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  circleActive: { borderColor: editorColors.accent },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, overflow: 'hidden' },
  glassSwatch: { backgroundColor: 'rgba(255, 255, 255, 0.28)', borderColor: 'rgba(255, 255, 255, 0.7)' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 },
  progressValue: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: editorColors.text,
    fontVariant: ['tabular-nums'],
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 },
  summary: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: editorColors.textMuted },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: editorColors.accent,
  },
  editText: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: editorColors.onAccent },
  toggles: { flexDirection: 'row', gap: 10, paddingHorizontal: 14 },
  // Diagonal slash over a hidden element's icon, like iOS's "off" glyphs.
  strike: {
    position: 'absolute',
    width: 26,
    height: 2,
    borderRadius: 1,
    backgroundColor: editorColors.textFaint,
    transform: [{ rotate: '-45deg' }],
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: editorColors.hairline,
  },
  tab: { width: 52, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: editorColors.surfaceRaised },
});
