import { Pressable, StyleSheet, View } from 'react-native';
import { LibraryIcon } from '@/components/Icons';
import { ProBadge } from '@/components/ProBadge';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { strings } from '@/i18n/es';
import { editorColors } from '@/theme/colors';
import type { TrackMetadata } from '@/types/music';
import { WIDGETS } from '@/widgets/registry';
import type { WidgetConfig, WidgetDefinition } from '@/widgets/types';
import { Tray } from './Tray';
import { WidgetPreview } from './WidgetPreview';

type Props = {
  track: TrackMetadata;
  selectedId: string;
  configFor: (widget: WidgetDefinition) => WidgetConfig;
  onSelect: (widget: WidgetDefinition) => void;
  onOpenLibrary: () => void;
};

const TILE_WIDTH = 76;
const TILE_HEIGHT = 50;

export function WidgetTray({ track, selectedId, configFor, onSelect, onOpenLibrary }: Props) {
  const { isPro } = useSubscription();
  const library = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.editor.library.open}
      onPress={onOpenLibrary}
      style={({ pressed }) => [styles.libraryItem, pressed && styles.pressed]}
    >
      <View style={[styles.tile, styles.libraryTile]}>
        <LibraryIcon size={22} color={editorColors.text} />
      </View>
    </Pressable>
  );

  return (
    <Tray leading={library}>
      {WIDGETS.map((widget) => {
        const active = widget.id === selectedId;
        const locked = widget.pro && !isPro;
        const label = strings.editor.widgetOption(widget.name);
        return (
          <Pressable
            key={widget.id}
            accessibilityRole="button"
            aria-selected={active}
            accessibilityLabel={locked ? strings.paywall.proLockedOption(label) : label}
            onPress={() => onSelect(widget)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={[styles.tile, active && styles.tileActive]}>
              <WidgetPreview
                widget={widget}
                track={track}
                config={configFor(widget)}
                width={TILE_WIDTH}
                height={TILE_HEIGHT}
              />
              {locked && <ProBadge style={styles.proBadge} />}
            </View>
          </Pressable>
        );
      })}
    </Tray>
  );
}

const styles = StyleSheet.create({
  proBadge: { position: 'absolute', top: 4, right: 4 },
  item: { alignItems: 'center', width: TILE_WIDTH },
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
  tileActive: { borderColor: editorColors.accent },
  libraryItem: { alignItems: 'center' },
  libraryTile: { width: TILE_HEIGHT, borderColor: editorColors.hairline, borderStyle: 'dashed' },
});
