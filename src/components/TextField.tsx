import { forwardRef, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { EyeIcon } from '@/components/Icons';
import { strings } from '@/i18n/es';
import { onboardingColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | null;
  secure?: boolean;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, secure = false, onFocus, onBlur, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // VoiceOver ignores the error's live region. Queued, because a failed submit can flag several
  // fields at once and each announcement would otherwise cut off the one before it.
  useEffect(() => {
    if (Platform.OS !== 'ios' || !error) return;
    AccessibilityInfo.announceForAccessibilityWithOptions(error, { queue: true });
  }, [error]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, focused && styles.focused, error ? styles.invalid : null]}>
        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={label}
          // Read again whenever the field gets focus, so the error isn't only a one-off announcement.
          accessibilityHint={error ?? undefined}
          secureTextEntry={secure && !revealed}
          placeholderTextColor={onboardingColors.inkMuted}
          style={styles.input}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? strings.auth.email.hidePassword : strings.auth.email.showPassword}
            hitSlop={10}
            onPress={() => setRevealed((value) => !value)}
          >
            <EyeIcon size={20} color={onboardingColors.inkMuted} off={revealed} />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text style={styles.error} aria-live="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 16, color: onboardingColors.ink, marginLeft: 20 },
  field: {
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    borderColor: 'rgba(10, 10, 9, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
  },
  focused: { borderColor: onboardingColors.ink },
  invalid: { borderColor: onboardingColors.error },
  input: { flex: 1, height: '100%', fontFamily: fonts.sansMedium, fontSize: 19, color: onboardingColors.ink },
  error: { fontFamily: fonts.sansMedium, fontSize: 15, color: onboardingColors.error, marginLeft: 20 },
});
