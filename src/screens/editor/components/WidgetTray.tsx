import { Pressable, StyleSheet, Text, View } from 'react-native';
import { strings } from '@/i18n/es';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import type { TrackMetadata } from '@/types/music';
import { WIDGETS } from '@/widgets/registry';
import type { WidgetDefinition, WidgetTone } from '@/widgets/types';
import { Tray } from './Tray';

type Props = {
  track: TrackMetadata;
  tone: WidgetTone;
  selectedId: string;
  onSelect: (widget: WidgetDefinition) => void;
};

const TILE_WIDTH = 96;
const TILE_HEIGHT = 58;

export function WidgetTray({ track, tone, selectedId, onSelect }: Props) {
  return (
    <Tray>
      {WIDGETS.map((widget) => (
        <WidgetTile
          key={widget.id}
          widget={widget}
          track={track}
          tone={tone}
          active={widget.id === selectedId}
          onPress={() => onSelect(widget)}
        />
      ))}
    </Tray>
  );
}

function WidgetTile({
  widget,
  track,
  tone,
  active,
  onPress,
}: {
  widget: WidgetDefinition;
  track: TrackMetadata;
  tone: WidgetTone;
  active: boolean;
  onPress: () => void;
}) {
  const scale = Math.min((TILE_WIDTH - 10) / widget.width, (TILE_HEIGHT - 6) / widget.height);
  const { Component } = widget;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.editor.widgetOption(widget.name)}
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
    >
      <View style={[styles.tile, active && styles.active]}>
        <View
          pointerEvents="none"
          style={{ width: widget.width, height: widget.height, transform: [{ scale }] }}
        >
          <Component track={track} tone={tone} />
        </View>
      </View>
      <Text style={[styles.name, active && styles.nameActive]}>{widget.name.toUpperCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 5 },
  pressed: { opacity: 0.6 },
  tile: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: 14,
    backgroundColor: editorColors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  active: { borderColor: editorColors.accent },
  name: { fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1.3, color: editorColors.textFaint },
  nameActive: { color: editorColors.text },
});
