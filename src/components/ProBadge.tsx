import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LockSimple } from 'phosphor-react-native/src/icons/LockSimple';
import { strings } from '@/i18n/es';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

// Marks a Shory Pro feature for someone on the free plan.
export function ProBadge({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.badge, style]} accessibilityElementsHidden importantForAccessibility="no">
      <LockSimple size={9} color={editorColors.onAccent} weight="bold" />
      <Text style={styles.text}>{strings.paywall.proBadge}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    height: 16,
    borderRadius: 8,
    backgroundColor: editorColors.accent,
  },
  text: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.6, color: editorColors.onAccent },
});
