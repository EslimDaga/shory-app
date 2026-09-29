import {
  SensorType,
  useAnimatedReaction,
  useAnimatedSensor,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

const GRAVITY = 9.81;
const SMOOTHING = 0.12;

export type DeviceTilt = { x: SharedValue<number>; y: SharedValue<number> };

const clampUnit = (value: number) => {
  'worklet';
  return Math.max(-1, Math.min(1, value));
};

export function useDeviceTilt(): DeviceTilt {
  const reduceMotion = useReducedMotion();
  const gravity = useAnimatedSensor(SensorType.GRAVITY);
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  useAnimatedReaction(
    () => gravity.sensor.value,
    (reading) => {
      if (reduceMotion) return;
      x.value += (clampUnit(reading.x / GRAVITY) - x.value) * SMOOTHING;
      y.value += (clampUnit(reading.y / GRAVITY + 0.55) - y.value) * SMOOTHING;
    },
  );

  return { x, y };
}
