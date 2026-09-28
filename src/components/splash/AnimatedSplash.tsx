import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Svg, { Path } from 'react-native-svg';
import { SplashOrb } from '@/components/splash/SplashOrb';
import { LOGO_BAR, LOGO_LETTERS, LOGO_VIEW_BOX } from '@/components/splash/logoGlyphs';
import { splashColors } from '@/theme/colors';

type Props = {
  ready: boolean;
  onExitStart?: () => void;
  onFinish: () => void;
};

const LOGO_WIDTH = 208;
const [VB_X, VB_Y, VB_W, VB_H] = LOGO_VIEW_BOX;
const SCALE = LOGO_WIDTH / VB_W;
const LOGO_HEIGHT = VB_H * SCALE;
const VIEW_BOX = LOGO_VIEW_BOX.join(' ');

const BAR_LEFT = (LOGO_BAR.x - VB_X) * SCALE;
const BAR_TOP = (LOGO_BAR.y - VB_Y) * SCALE;
const BAR_WIDTH = LOGO_BAR.width * SCALE;
const BAR_HEIGHT = LOGO_BAR.height * SCALE;
const FILL_WIDTH = BAR_WIDTH * LOGO_BAR.progress;
const KNOB_SIZE = LOGO_BAR.knobRadius * 2 * SCALE;

const ORB_MS = 760;
const LETTER_DELAY_MS = 160;
const LETTER_STAGGER_MS = 70;
const LETTER_MS = 460;
const LETTER_RISE = 16;
const BAR_DELAY_MS = 560;
const FILL_DELAY_MS = 700;
const FILL_MS = 620;
const HOLD_MS = 260;
const EXIT_MS = 340;

const easeOut = Easing.out(Easing.cubic);

function timing(value: Animated.Value, delay: number, duration: number, easing = easeOut) {
  return Animated.timing(value, { toValue: 1, delay, duration, easing, useNativeDriver: true });
}

export function AnimatedSplash({ ready, onExitStart, onFinish }: Props) {
  const [values] = useState(() => ({
    orb: new Animated.Value(0),
    letters: LOGO_LETTERS.map(() => new Animated.Value(0)),
    track: new Animated.Value(0),
    fill: new Animated.Value(0),
    knob: new Animated.Value(0),
    exit: new Animated.Value(0),
  }));
  const [laidOut, setLaidOut] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    if (!laidOut) return;
    let cancelled = false;
    let intro: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        [values.orb, ...values.letters, values.track, values.fill, values.knob].forEach((v) => v.setValue(1));
        setIntroDone(true);
        return;
      }
      intro = Animated.parallel([
        timing(values.orb, 0, ORB_MS),
        ...values.letters.map((v, i) => timing(v, LETTER_DELAY_MS + i * LETTER_STAGGER_MS, LETTER_MS)),
        timing(values.track, BAR_DELAY_MS, 260),
        timing(values.fill, FILL_DELAY_MS, FILL_MS, Easing.inOut(Easing.cubic)),
        timing(values.knob, FILL_DELAY_MS, 420, Easing.out(Easing.back(1.1))),
      ]);
      intro.start(({ finished }) => {
        if (finished) setTimeout(() => !cancelled && setIntroDone(true), HOLD_MS);
      });
    });

    return () => {
      cancelled = true;
      intro?.stop();
    };
  }, [laidOut, values]);

  useEffect(() => {
    if (!introDone || !ready) return;
    const exit = timing(values.exit, 0, EXIT_MS, Easing.in(Easing.cubic));
    onExitStart?.();
    exit.start(({ finished }) => finished && onFinish());
    return () => exit.stop();
  }, [introDone, ready, values, onExitStart, onFinish]);

  const handleLayout = () => {
    if (laidOut) return;
    SplashScreen.hide();
    setLaidOut(true);
  };

  const exitScale = values.exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const opacity = values.exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const orbScale = values.orb.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  const knobX = values.fill.interpolate({ inputRange: [0, 1], outputRange: [0, FILL_WIDTH] });

  return (
    <Animated.View
      style={[styles.root, { opacity }]}
      pointerEvents={introDone && ready ? 'none' : 'auto'}
      onLayout={handleLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Shory"
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: values.orb, transform: [{ scale: orbScale }] }]}>
        <SplashOrb />
      </Animated.View>

      <Animated.View style={[styles.logo, { transform: [{ scale: exitScale }] }]}>
        {LOGO_LETTERS.map((d, i) => {
          const progress = values.letters[i];
          const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [LETTER_RISE, 0] });
          return (
            <Animated.View
              key={d}
              style={[StyleSheet.absoluteFill, { opacity: progress, transform: [{ translateY }] }]}
            >
              <Svg width={LOGO_WIDTH} height={LOGO_HEIGHT} viewBox={VIEW_BOX}>
                <Path d={d} fill={splashColors.ink} />
              </Svg>
            </Animated.View>
          );
        })}

        <Animated.View style={[styles.track, { opacity: values.track }]} />
        <Animated.View style={[styles.fill, { transform: [{ scaleX: values.fill }] }]} />
        <Animated.View
          style={[styles.knob, { transform: [{ translateX: knobX }, { scale: values.knob }] }]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: splashColors.background,
  },
  logo: { width: LOGO_WIDTH, height: LOGO_HEIGHT },
  track: {
    position: 'absolute',
    left: BAR_LEFT,
    top: BAR_TOP,
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: splashColors.track,
  },
  fill: {
    position: 'absolute',
    left: BAR_LEFT,
    top: BAR_TOP,
    width: FILL_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: splashColors.ink,
    transformOrigin: 'left center',
  },
  knob: {
    position: 'absolute',
    left: BAR_LEFT - KNOB_SIZE / 2,
    top: BAR_TOP + BAR_HEIGHT / 2 - KNOB_SIZE / 2,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: splashColors.ink,
  },
});
