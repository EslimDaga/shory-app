import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { ProBadge } from '@/components/ProBadge';
import { strings } from '@/i18n/es';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import type { TrackMetadata } from '@/types/music';
import { WIDGET_CATEGORIES, WIDGETS } from '@/widgets/registry';
import type { WidgetCategory, WidgetConfig, WidgetDefinition } from '@/widgets/types';
import { WidgetPreview } from './WidgetPreview';

type Props = {
  visible: boolean;
  track: TrackMetadata;
  selectedId: string;
  configFor: (widget: WidgetDefinition) => WidgetConfig;
  onSelect: (widget: WidgetDefinition) => void;
  onClose: () => void;
  onClosed?: () => void;
};

type Filter = WidgetCategory | 'all';

const COLUMNS = 2;
const GAP = 12;
const SHEET_PADDING = 22;
const CARD_ASPECT = 0.62;

export function WidgetLibrarySheet({
  visible,
  track,
  selectedId,
  configFor,
  onSelect,
  onClose,
  onClosed,
}: Props) {
  const { isPro } = useSubscription();
  const window = useWindowDimensions();
  const [filter, setFilter] = useState<Filter>('all');
  const cardWidth = (window.width - SHEET_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const cardHeight = cardWidth * CARD_ASPECT;
  const visibleWidgets = filter === 'all' ? WIDGETS : WIDGETS.filter((widget) => widget.category === filter);
  const categoryLabel = (id: WidgetCategory) =>
    WIDGET_CATEGORIES.find((category) => category.id === id)?.label;

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: strings.widgets.categories.all },
    ...WIDGET_CATEGORIES,
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} onClosed={onClosed} tone="dark">
      <Text style={styles.title}>{strings.editor.library.title}</Text>
      <Text style={styles.subtitle}>{strings.editor.library.subtitle(WIDGETS.length)}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filters}
      >
        {filters.map(({ id, label }) => {
          const active = id === filter;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              aria-selected={active}
              onPress={() => setFilter(id)}
              style={[styles.filter, active && styles.filterActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView style={{ maxHeight: window.height * 0.5 }} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {visibleWidgets.map((widget) => {
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
                style={({ pressed }) => [{ width: cardWidth }, pressed && styles.pressed]}
              >
                <View style={[styles.card, { height: cardHeight }, active && styles.cardActive]}>
                  <WidgetPreview
                    widget={widget}
                    track={track}
                    config={configFor(widget)}
                    width={cardWidth - 3}
                    height={cardHeight - 3}
                    padding={10}
                  />
                  {locked ? (
                    <ProBadge style={styles.badge} />
                  ) : (
                    widget.isNew && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{strings.editor.library.badgeNew}</Text>
                      </View>
                    )
                  )}
                </View>
                <Text style={styles.cardName}>{widget.name}</Text>
                <Text style={styles.cardCategory}>{categoryLabel(widget.category)}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.sansExtraBold, fontSize: 24, letterSpacing: -0.6, color: editorColors.text },
  subtitle: { fontFamily: fonts.sansMedium, fontSize: 14, color: editorColors.textMuted, marginTop: 2 },
  filtersScroll: { marginHorizontal: -SHEET_PADDING, marginTop: 16, marginBottom: 16, flexGrow: 0 },
  filters: { paddingHorizontal: SHEET_PADDING, gap: 8 },
  filter: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: editorColors.surfaceRaised,
    justifyContent: 'center',
  },
  filterActive: { backgroundColor: editorColors.text },
  filterText: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: editorColors.textMuted },
  filterTextActive: { color: editorColors.background },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingBottom: 8 },
  pressed: { opacity: 0.7 },
  card: {
    borderRadius: 18,
    backgroundColor: editorColors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardActive: { borderColor: editorColors.accent },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: editorColors.accent,
  },
  badgeText: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.8, color: editorColors.onAccent },
  cardName: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: editorColors.text, marginTop: 8 },
  cardCategory: { fontFamily: fonts.sansMedium, fontSize: 12, color: editorColors.textFaint, marginTop: 1 },
});
