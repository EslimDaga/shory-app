import { Pressable, StyleSheet, Text, View } from 'react-native';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { RAIL_TOOLS, type EditorTool, type RailTool } from '../editorTools';

type Props = {
  activeTool: EditorTool | null;
  onToggle: (tool: RailTool) => void;
  // Icons only, so the rail doesn't cover a full-story template's own header.
  compact?: boolean;
};

export function ToolRail({ activeTool, onToggle, compact = false }: Props) {
  return (
    <View style={styles.rail}>
      {RAIL_TOOLS.map(({ id, label, Icon }) => {
        const active = activeTool === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => onToggle(id)}
            hitSlop={6}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            {!compact && <Text style={styles.label}>{label}</Text>}
            <View style={[styles.icon, active && styles.iconActive]}>
              <Icon size={20} color={active ? editorColors.onAccent : editorColors.text} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { position: 'absolute', top: 14, right: 12, gap: 14, alignItems: 'flex-end' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.6 },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: editorColors.text,
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: editorColors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: { backgroundColor: editorColors.accent },
});
