import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { BackIcon } from '@/components/Icons';
import { strings } from '@/i18n/es';
import { onboardingColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

type Props = {
  onBack: () => void;
  progress?: number;
  onSkip?: () => void;
};

export function OnboardingHeader({ onBack, progress, onSkip }: Props) {
  return (
    <View style={styles.header}>
      <BackButton onPress={onBack} />
      {progress === undefined ? <View style={styles.flex} /> : <ProgressBar progress={progress} />}
      {onSkip ? (
        <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={12} style={styles.skip}>
          <Text style={styles.skipText}>{strings.onboarding.skip}</Text>
        </Pressable>
      ) : (
        <View style={styles.skip} />
      )}
    </View>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.onboarding.back}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}
    >
      <BackIcon size={22} color={onboardingColors.ink} />
    </Pressable>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const [value] = useState(() => new Animated.Value(Math.max(0, progress - 0.2)));

  useEffect(() => {
    const animation = Animated.timing(value, {
      toValue: progress,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, value]);

  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
    >
      <Animated.View style={[styles.fill, { transform: [{ scaleX: value }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, height: 56 },
  flex: { flex: 1 },
  back: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A0A09',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  pressed: { opacity: 0.7 },
  track: { flex: 1, height: 7, borderRadius: 4, backgroundColor: onboardingColors.track, overflow: 'hidden' },
  fill: {
    position: 'absolute',
    inset: 0,
    backgroundColor: onboardingColors.progress,
    borderRadius: 4,
    transformOrigin: 'left center',
  },
  skip: { minWidth: 48, alignItems: 'flex-end' },
  skipText: { fontFamily: fonts.sansSemiBold, fontSize: 16, color: onboardingColors.inkMuted },
});
