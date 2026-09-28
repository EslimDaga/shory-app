import { useEffect, useEffectEvent } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { strings } from '@/i18n/es';
import { onboardingColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { evaluatePassword, type PasswordRequirement } from '@/utils/passwordStrength';

type Props = {
  password: string;
  invalid?: boolean;
};

const SEGMENTS = 4;
const FILL_MS = 260;
const LEVEL_COLORS = ['#C8321F', '#C8321F', '#E8870C', '#7FA300', '#1E9E5A'];
const text = strings.auth.email.strength;

const HINTS: Record<PasswordRequirement, string> = {
  length: text.needLength,
  mixedCase: text.needMixedCase,
  number: text.needNumber,
  symbol: text.needSymbol,
};

function hintFor(score: number, missing: PasswordRequirement[]): string {
  if (score === 0) return text.empty;
  if (missing.length === 0) return text.strong;
  return HINTS[missing[0]];
}

export function PasswordStrengthMeter({ password, invalid = false }: Props) {
  const { score, missing } = evaluatePassword(password);
  const hint = hintFor(score, missing);
  const level = useSharedValue<number>(score);

  useEffect(() => {
    level.value = withTiming(score, { duration: FILL_MS, easing: Easing.out(Easing.cubic) });
  }, [score, level]);

  // VoiceOver ignores the hint's live region. Speak it only when a submit rejects the password,
  // not on every keystroke that changes it.
  const announceHint = useEffectEvent(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibilityWithOptions(hint, { queue: true });
  });

  useEffect(() => {
    if (invalid) announceHint();
  }, [invalid]);

  return (
    <View style={styles.root}>
      <Text
        style={[styles.hint, invalid && styles.hintInvalid, missing.length === 0 && styles.hintStrong]}
        aria-live="polite"
      >
        {hint}
      </Text>
      <View
        style={styles.segments}
        accessibilityRole="progressbar"
        accessibilityLabel={text.label}
        aria-valuemin={0}
        aria-valuemax={SEGMENTS}
        aria-valuenow={score}
      >
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <Segment key={index} index={index} level={level} />
        ))}
      </View>
    </View>
  );
}

function Segment({ index, level }: { index: number; level: SharedValue<number> }) {
  const fillStyle = useAnimatedStyle(() => ({
    // Each segment fills as the level sweeps past it; all filled segments share the level's color.
    transform: [{ scaleX: Math.min(1, Math.max(0, level.value - index)) }],
    backgroundColor: interpolateColor(level.value, [0, 1, 2, 3, 4], LEVEL_COLORS),
  }));

  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8, paddingHorizontal: 20 },
  hint: { fontFamily: fonts.sansMedium, fontSize: 14, color: onboardingColors.inkMuted },
  hintInvalid: { color: onboardingColors.error },
  hintStrong: { color: '#1E9E5A' },
  segments: { flexDirection: 'row', gap: 6 },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(10, 10, 9, 0.1)',
    overflow: 'hidden',
  },
  fill: { ...StyleSheet.absoluteFill, borderRadius: 3, transformOrigin: 'left center' },
});
