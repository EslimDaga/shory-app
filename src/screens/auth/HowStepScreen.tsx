import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { riseIn, zoomIn } from '@/components/motion/calmEntrance';
import { KineticText } from '@/components/motion/KineticText';
import { PillButton } from '@/components/PillButton';
import { strings } from '@/i18n/es';
import { brand, onboardingColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { OnboardingHeader } from './components/OnboardingHeader';
import { StoryComposition } from './components/StoryComposition';

const CARD_DELAY_MS = 220;
const STEPS_DELAY_MS = 520;
const STEP_STAGGER_MS = 120;

type Props = {
  progress: number;
  onBack: () => void;
  onContinue: () => void;
};

export function HowStepScreen({ progress, onBack, onContinue }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <OnboardingHeader onBack={onBack} progress={progress} />
      <View style={styles.titleBlock}>
        <KineticText text={strings.onboarding.howTitle} style={styles.title} delay={100} />
      </View>

      <View style={styles.body}>
        <Animated.View entering={zoomIn(CARD_DELAY_MS)} style={styles.preview}>
          <StoryComposition />
        </Animated.View>

        <View style={styles.steps}>
          {strings.onboarding.howSteps.map((step, index) => {
            const delay = STEPS_DELAY_MS + index * STEP_STAGGER_MS;
            return (
              <Animated.View key={step.title} entering={riseIn(delay)} style={styles.step}>
                <Animated.View entering={zoomIn(delay + 160)} style={styles.badge}>
                  <Text style={styles.badgeText}>{index + 1}</Text>
                </Animated.View>
                <View style={styles.stepText}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepBody}>{step.body}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </View>

      <Animated.View entering={riseIn(STEPS_DELAY_MS + STEP_STAGGER_MS * 3 + 120)}>
        <PillButton label={strings.onboarding.continue} onPress={onContinue} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: onboardingColors.background, paddingHorizontal: 20 },
  titleBlock: { marginTop: 28 },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 30,
    letterSpacing: -0.8,
    color: onboardingColors.ink,
  },
  body: { flex: 1, justifyContent: 'center', gap: 28 },
  preview: { alignItems: 'center' },
  steps: { gap: 10 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: onboardingColors.row,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.sansExtraBold, fontSize: 16, color: brand[950] },
  stepText: { flex: 1, gap: 2 },
  stepTitle: { fontFamily: fonts.sansSemiBold, fontSize: 17, color: onboardingColors.ink },
  stepBody: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 19, color: onboardingColors.inkMuted },
});
