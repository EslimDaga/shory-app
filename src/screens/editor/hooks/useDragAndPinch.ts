import { useLayoutEffect, useState } from 'react';
import { Animated, PanResponder, type GestureResponderEvent } from 'react-native';
import { hapticSelection } from '@/utils/haptics';

const MIN_SCALE = 0.45;
const MAX_SCALE = 2.6;
const SNAP_DISTANCE = 10;

export type AlignmentGuides = { vertical: boolean; horizontal: boolean };

const NO_GUIDES: AlignmentGuides = { vertical: false, horizontal: false };

const touchDistance = (event: GestureResponderEvent) => {
  const [first, second] = event.nativeEvent.touches;
  return Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
};

const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

const snapToCenter = (value: number) => (Math.abs(value) < SNAP_DISTANCE ? 0 : value);

export function useDragAndPinch(resetKey: string) {
  const [translation] = useState(() => new Animated.ValueXY());
  const [pinchScale] = useState(() => new Animated.Value(1));
  const [guides, setGuides] = useState<AlignmentGuides>(NO_GUIDES);

  const [gestures] = useState(() => {
    const gesture = {
      touches: 0,
      baseDx: 0,
      baseDy: 0,
      originX: 0,
      originY: 0,
      x: 0,
      y: 0,
      startDistance: 1,
      startScale: 1,
      scale: 1,
      guides: NO_GUIDES,
    };

    const showGuides = (next: AlignmentGuides) => {
      const current = gesture.guides;
      if (next.vertical === current.vertical && next.horizontal === current.horizontal) return;
      if ((next.vertical && !current.vertical) || (next.horizontal && !current.horizontal)) {
        hapticSelection();
      }
      gesture.guides = next;
      setGuides(next);
    };

    const beginSegment = (event: GestureResponderEvent, dx: number, dy: number) => {
      gesture.touches = event.nativeEvent.touches.length;
      gesture.baseDx = dx;
      gesture.baseDy = dy;
      gesture.originX = gesture.x;
      gesture.originY = gesture.y;
      if (gesture.touches >= 2) {
        gesture.startDistance = touchDistance(event);
        gesture.startScale = gesture.scale;
      }
    };

    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => beginSegment(event, 0, 0),
      onPanResponderMove: (event, state) => {
        if (event.nativeEvent.touches.length !== gesture.touches) {
          beginSegment(event, state.dx, state.dy);
        }
        if (gesture.touches >= 2) {
          gesture.scale = clampScale((gesture.startScale * touchDistance(event)) / gesture.startDistance);
          pinchScale.setValue(gesture.scale);
          return;
        }
        gesture.x = snapToCenter(gesture.originX + state.dx - gesture.baseDx);
        gesture.y = snapToCenter(gesture.originY + state.dy - gesture.baseDy);
        translation.setValue({ x: gesture.x, y: gesture.y });
        showGuides({ vertical: gesture.x === 0, horizontal: gesture.y === 0 });
      },
      onPanResponderRelease: () => showGuides(NO_GUIDES),
      onPanResponderTerminate: () => showGuides(NO_GUIDES),
    });

    const reset = () => {
      gesture.x = 0;
      gesture.y = 0;
      gesture.scale = 1;
      translation.setValue({ x: 0, y: 0 });
      pinchScale.setValue(1);
    };

    return { panHandlers: responder.panHandlers, reset };
  });

  // Layout effect so a newly selected widget never paints at the previous widget's position.
  useLayoutEffect(() => {
    gestures.reset();
  }, [resetKey, gestures]);

  return { translation, pinchScale, guides, panHandlers: gestures.panHandlers };
}
