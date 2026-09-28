import { Pressable, StyleSheet, View } from 'react-native';
import { CloseIcon, PencilIcon } from '@/components/Icons';
import { ProBadge } from '@/components/ProBadge';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { strings } from '@/i18n/es';
import { editorColors } from '@/theme/colors';
import { STORY_ASPECT } from '@/theme/layout';
import type { StoryBackground } from '@/types/storyBackground';
import type { TrackMetadata } from '@/types/music';
import { TEMPLATES } from '@/templates/registry';
import type { TemplateDefinition } from '@/templates/types';
import type { AudioDevice } from '@/widgets/AudioDeviceIcon';
import { Tray } from './Tray';

type Props = {
  background: StoryBackground;
  // Each tile previews its template with that template's own edits.
  contentFor: (template: TemplateDefinition) => {
    track: TrackMetadata;
    userName: string;
    device: AudioDevice | null;
  };
  selectedId: string | null;
  onSelect: (template: TemplateDefinition | null) => void;
  onEdit: () => void;
};

const TILE_WIDTH = 42;
const TILE_HEIGHT = TILE_WIDTH * STORY_ASPECT;

export function TemplateTray({ background, contentFor, selectedId, onSelect, onEdit }: Props) {
  const { isPro } = useSubscription();
  return (
    <Tray>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.templates.none}
        accessibilityState={{ selected: selectedId === null }}
        onPress={() => onSelect(null)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={[styles.tile, styles.noneTile, selectedId === null && styles.tileActive]}>
          <CloseIcon size={18} color={editorColors.textMuted} />
        </View>
      </Pressable>

      {selectedId !== null && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.templates.edit.title(
            TEMPLATES.find((template) => template.id === selectedId)?.name ?? '',
          )}
          onPress={onEdit}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <View style={[styles.tile, styles.editTile]}>
            <PencilIcon size={18} color={editorColors.onAccent} />
          </View>
        </Pressable>
      )}

      {TEMPLATES.map((template) => {
        const active = template.id === selectedId;
        const { Component } = template;
        return (
          <Pressable
            key={template.id}
            accessibilityRole="button"
            accessibilityLabel={strings.templates.option(template.name)}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(template)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View style={[styles.tile, active && styles.tileActive]} pointerEvents="none">
              <Component
                {...contentFor(template)}
                background={background}
                width={TILE_WIDTH}
                height={TILE_HEIGHT}
              />
              {template.pro && !isPro && <ProBadge style={styles.proBadge} />}
            </View>
          </Pressable>
        );
      })}
    </Tray>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  proBadge: { position: 'absolute', top: 3, left: 4 },
  tile: {
    width: TILE_WIDTH + 3,
    height: TILE_HEIGHT + 3,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: editorColors.surfaceRaised,
  },
  tileActive: { borderColor: editorColors.accent },
  editTile: { alignItems: 'center', justifyContent: 'center', backgroundColor: editorColors.accent },
  noneTile: { alignItems: 'center', justifyContent: 'center', borderColor: editorColors.hairline },
});
