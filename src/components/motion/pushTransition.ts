import {
  Easing,
  withDelay,
  withTiming,
  type EntryAnimationsValues,
  type EntryExitAnimationFunction,
  type ExitAnimationsValues,
} from 'react-native-reanimated';

export type PushDirection = 1 | -1;

// A shared-axis push: both screens drift a short way along the same axis while they cross-fade.
// Neither slides fully across the other, so screens with different backgrounds never show a hard
// edge between them.
const DURATION_MS = 380;
const FADE_OUT_MS = 150;
const FADE_IN_DELAY_MS = 90;
const SHIFT = 0.12;
const move = Easing.bezier(0.22, 1, 0.36, 1);
const fadeOut = Easing.out(Easing.quad);
const fadeIn = Easing.bezier(0.33, 0, 0.2, 1);

export function pushEntering(direction: PushDirection): EntryExitAnimationFunction {
  return (values: EntryAnimationsValues) => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateX: values.windowWidth * SHIFT * direction }] },
      animations: {
        opacity: withDelay(
          FADE_IN_DELAY_MS,
          withTiming(1, { duration: DURATION_MS - FADE_IN_DELAY_MS, easing: fadeIn }),
        ),
        transform: [{ translateX: withTiming(0, { duration: DURATION_MS, easing: move }) }],
      },
    };
  };
}

export function pushExiting(direction: PushDirection): EntryExitAnimationFunction {
  return (values: ExitAnimationsValues) => {
    'worklet';
    return {
      initialValues: { opacity: 1, transform: [{ translateX: 0 }] },
      animations: {
        opacity: withTiming(0, { duration: FADE_OUT_MS, easing: fadeOut }),
        transform: [
          {
            translateX: withTiming(-values.windowWidth * SHIFT * direction, {
              duration: DURATION_MS,
              easing: move,
            }),
          },
        ],
      },
    };
  };
}
