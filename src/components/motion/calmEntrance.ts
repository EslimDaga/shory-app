import { Easing, FadeInDown, LinearTransition, ZoomIn } from 'react-native-reanimated';

// Timed (never spring) entrances: elements ease into place and stop, with no overshoot or bounce.
const EASE_OUT = Easing.out(Easing.cubic);
const RISE_MS = 520;
const ZOOM_MS = 460;
const LAYOUT_MS = 300;

export function riseIn(delay = 0) {
  return FadeInDown.delay(delay).duration(RISE_MS).easing(EASE_OUT);
}

export function zoomIn(delay = 0) {
  return ZoomIn.delay(delay).duration(ZOOM_MS).easing(EASE_OUT);
}

export const calmLayout = LinearTransition.duration(LAYOUT_MS).easing(Easing.inOut(Easing.cubic));
