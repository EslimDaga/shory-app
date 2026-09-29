import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';
import { KineticText } from '@/components/motion/KineticText';
import { PillButton } from '@/components/PillButton';
import { riseIn } from '@/components/motion/calmEntrance';
import { strings } from '@/i18n/es';
import { brand, onboardingColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { FloatingCollage } from './components/FloatingCollage';
import { LegalNote } from './components/LegalNote';

type Props = {
  revealed: boolean;
  onGetStarted: () => void;
  onHaveAccount: () => void;
};

const EXIT_MS = 420;
const TITLE_DELAY_MS = 520;
const BACKGROUND = '#FBFBF6';

export function WelcomeScreen({ revealed, onGetStarted, onHaveAccount }: Props) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const leaving = useSharedValue(0);

  const collageHeight = window.height * 0.54;

  const leaveThen = (next: () => void) => {
    if (leaving.value > 0) return;
    leaving.value = withTiming(1, {
      duration: EXIT_MS,
      easing: Easing.in(Easing.cubic),
    });
    setTimeout(next, EXIT_MS - 80);
  };

  const panelStyle = useAnimatedStyle(() => ({
    opacity: 1 - leaving.value,
    transform: [{ translateY: leaving.value * 40 }],
  }));

  return (
    <View style={styles.screen}>
      <Svg width={window.width} height={window.height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient
            id="welcome-glow"
            cx={window.width / 2}
            cy={collageHeight * 0.55}
            rx={window.width * 0.85}
            ry={collageHeight * 0.6}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={brand[500]} stopOpacity={0.55} />
            <Stop offset="0.55" stopColor={brand[300]} stopOpacity={0.22} />
            <Stop offset="1" stopColor={BACKGROUND} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={window.width} height={window.height} fill={BACKGROUND} />
        <Ellipse
          cx={window.width / 2}
          cy={collageHeight * 0.55}
          rx={window.width * 0.85}
          ry={collageHeight * 0.6}
          fill="url(#welcome-glow)"
        />
      </Svg>

      <View style={[styles.collage, { paddingTop: insets.top }]}>
        <FloatingCollage
          width={window.width}
          height={collageHeight - insets.top}
          active={revealed}
          leaving={leaving}
        />
      </View>

      <Animated.View style={[styles.panel, { paddingBottom: insets.bottom + 16 }, panelStyle]}>
        {revealed && (
          <>
            <Animated.Text entering={FadeIn.delay(TITLE_DELAY_MS - 180).duration(500)} style={styles.eyebrow}>
              {strings.onboarding.welcomeEyebrow}
            </Animated.Text>
            <KineticText
              text={strings.onboarding.welcomeTitle}
              highlight={strings.onboarding.welcomeHighlight}
              style={styles.title}
              delay={TITLE_DELAY_MS}
            />
            <Animated.View entering={FadeIn.delay(TITLE_DELAY_MS + 600).duration(500)} style={styles.legal}>
              <LegalNote />
            </Animated.View>
            <View style={styles.actions}>
              <Animated.View entering={riseIn(TITLE_DELAY_MS + 420)}>
                <PillButton label={strings.onboarding.getStarted} onPress={() => leaveThen(onGetStarted)} />
              </Animated.View>
              <Animated.View entering={riseIn(TITLE_DELAY_MS + 500)}>
                <PillButton
                  label={strings.onboarding.haveAccount}
                  variant="light"
                  onPress={() => leaveThen(onHaveAccount)}
                />
              </Animated.View>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BACKGROUND },
  collage: { zIndex: 1 },
  panel: { flex: 1, paddingHorizontal: 20, justifyContent: 'flex-end' },
  eyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    color: onboardingColors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
    color: onboardingColors.ink,
  },
  legal: { marginTop: 14 },
  actions: { gap: 12, marginTop: 18 },
});
