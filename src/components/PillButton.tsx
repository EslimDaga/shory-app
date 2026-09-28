import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { brand } from '@/theme/colors';
import { fonts } from '@/theme/typography';

export type PillVariant = 'dark' | 'light' | 'lime';

type Props = {
  label: string;
  onPress: () => void;
  variant?: PillVariant;
  icon?: ReactNode;
  iconPlacement?: 'inline' | 'leading';
  loading?: boolean;
  disabled?: boolean;
};

const VARIANTS = {
  dark: { background: '#0A0A09', border: '#0A0A09', text: '#FFFFFF' },
  light: { background: '#FFFFFF', border: 'rgba(10, 10, 9, 0.12)', text: '#0A0A09' },
  lime: { background: brand[600], border: brand[600], text: brand[950] },
} as const;

const LEADING_INSET = 22;
const LEADING_SLOT = 24;

export function PillButton({
  label,
  onPress,
  variant = 'dark',
  icon,
  iconPlacement = 'inline',
  loading = false,
  disabled = false,
}: Props) {
  const colors = VARIANTS[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      // `disabled` already reports the disabled state on every platform.
      aria-busy={loading}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.background, borderColor: colors.border },
        pressed && styles.pressed,
        disabled && !loading && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : iconPlacement === 'leading' && icon ? (
        <>
          <View style={styles.leadingIcon}>{icon}</View>
          <Text style={[styles.label, styles.leadingLabel, { color: colors.text }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  leadingIcon: {
    position: 'absolute',
    left: LEADING_INSET,
    width: LEADING_SLOT,
    height: LEADING_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Symmetric padding keeps the label optically centered on the whole button.
  leadingLabel: { paddingHorizontal: LEADING_SLOT + 10 },
  label: { fontFamily: fonts.sansExtraBold, fontSize: 18, letterSpacing: -0.3 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.35 },
});
