import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckIcon, ChevronRightIcon } from '@/components/Icons';
import { riseIn, zoomIn } from '@/components/motion/calmEntrance';
import { KineticText } from '@/components/motion/KineticText';
import { SourceLogo } from '@/components/SourceLogo';
import { strings } from '@/i18n/es';
import { brand, onboardingColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { SOURCE_NAMES, SUPPORTED_SOURCES, type MusicSource } from '@/types/music';
import { hapticSelection } from '@/utils/haptics';
import { OnboardingHeader } from './components/OnboardingHeader';

type Props = {
  progress: number;
  selected: MusicSource | null;
  onBack: () => void;
  onSelect: (source: MusicSource | null) => void;
};

type Choice = MusicSource | 'several';

const ROWS_DELAY_MS = 380;
const ROW_STAGGER_MS = 75;
const ADVANCE_DELAY_MS = 460;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SourceStepScreen({ progress, selected, onBack, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<Choice | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Back (on screen or hardware) unmounts this step; a pending advance must not push 'how' after it.
  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  const choose = (choice: Choice) => {
    if (picked) return;
    hapticSelection();
    setPicked(choice);
    advanceTimer.current = setTimeout(() => onSelect(choice === 'several' ? null : choice), ADVANCE_DELAY_MS);
  };

  const skip = () => {
    // A picked row is already advancing; skipping too would push 'how' twice.
    if (picked) return;
    onSelect(null);
  };

  const choices: { choice: Choice; label: string; icon: ReactNode }[] = [
    ...SUPPORTED_SOURCES.map((source) => ({
      choice: source,
      label: SOURCE_NAMES[source],
      icon: <SourceLogo source={source} size={30} />,
    })),
    {
      choice: 'several' as const,
      label: strings.onboarding.sourceSeveral,
      icon: (
        <View style={styles.stack}>
          {SUPPORTED_SOURCES.map((source, index) => (
            <View key={source} style={[styles.stackItem, { marginLeft: index === 0 ? 0 : -10 }]}>
              <SourceLogo source={source} size={20} />
            </View>
          ))}
        </View>
      ),
    },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <OnboardingHeader onBack={onBack} progress={progress} onSkip={skip} />
      <View style={styles.titleBlock}>
        <KineticText text={strings.onboarding.sourceTitle} style={styles.title} delay={120} />
      </View>
      <Animated.Text entering={FadeIn.delay(420).duration(500)} style={styles.subtitle}>
        {strings.onboarding.sourceSubtitle}
      </Animated.Text>

      <View style={styles.options}>
        {choices.map(({ choice, label, icon }, index) => (
          <OptionRow
            key={choice}
            index={index}
            label={label}
            icon={icon}
            active={picked ? picked === choice : selected === choice}
            dimmed={picked !== null && picked !== choice}
            onPress={() => choose(choice)}
          />
        ))}
      </View>
    </View>
  );
}

function OptionRow({
  index,
  label,
  icon,
  active,
  dimmed,
  onPress,
}: {
  index: number;
  label: string;
  icon: ReactNode;
  active: boolean;
  dimmed: boolean;
  onPress: () => void;
}) {
  const press = useSharedValue(1);
  const pop = useSharedValue(1);

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const handlePress = () => {
    pop.set(
      withSequence(
        withSpring(1.12, { damping: 16, stiffness: 380 }),
        withSpring(1, { damping: 20, stiffness: 240 }),
      ),
    );
    onPress();
  };

  return (
    // The entrance lives on a wrapper: the pressable animates its own scale on touch, and a layout
    // animation on the same view would fight over `transform`.
    <Animated.View entering={riseIn(ROWS_DELAY_MS + index * ROW_STAGGER_MS)}>
      <AnimatedPressable
        accessibilityRole="button"
        aria-selected={active}
        onPress={handlePress}
        onPressIn={() => {
          press.set(withSpring(0.96, { damping: 30, stiffness: 400 }));
        }}
        onPressOut={() => {
          press.set(withSpring(1, { damping: 26, stiffness: 260 }));
        }}
        style={rowStyle}
      >
        <View style={[styles.row, active ? styles.rowActive : styles.rowIdle]}>
          <View style={[styles.rowContent, dimmed && styles.rowDimmed]}>
            <Animated.View style={[styles.rowIcon, iconStyle]}>{icon}</Animated.View>
            <Text style={styles.rowLabel}>{label}</Text>
          </View>
          {active ? (
            <Animated.View entering={zoomIn()} style={styles.check}>
              <CheckIcon size={16} color={brand[950]} />
            </Animated.View>
          ) : (
            <ChevronRightIcon size={18} color={onboardingColors.inkMuted} />
          )}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: onboardingColors.background, paddingHorizontal: 20 },
  titleBlock: { marginTop: 28 },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: onboardingColors.ink,
  },
  subtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 21,
    color: onboardingColors.inkMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  options: { gap: 12, marginTop: 34 },
  row: {
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 14,
  },
  rowIdle: { backgroundColor: onboardingColors.row, borderColor: 'transparent' },
  rowActive: { backgroundColor: brand[100], borderColor: brand[600] },
  rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowDimmed: { opacity: 0.4 },
  rowIcon: { width: 54, alignItems: 'flex-start' },
  rowLabel: { flex: 1, fontFamily: fonts.sansSemiBold, fontSize: 18, color: onboardingColors.ink },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: { flexDirection: 'row' },
  stackItem: { borderRadius: 12, borderWidth: 2, borderColor: onboardingColors.row },
});
