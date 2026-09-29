import { useLayoutEffect, useState } from 'react';
import {
  Animated,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { hapticSelection } from '@/utils/haptics';

const MIN_SCALE = 0.45;
const MAX_SCALE = 2.6;
const SNAP_DISTANCE = 10;
// Pinching within this of the widget's own size settles on exactly 100%.
const SCALE_SNAP = 0.05;

export type AlignmentGuides = { vertical: boolean; horizontal: boolean };

const NO_GUIDES: AlignmentGuides = { vertical: false, horizontal: false };

type Touches = GestureResponderEvent['nativeEvent']['touches'];

const touchDistance = ([first, second]: Touches) =>
  Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);

const touchCenter = ([first, second]: Touches) => ({
  x: (first.pageX + second.pageX) / 2,
  y: (first.pageY + second.pageY) / 2,
});

const snapToCenter = (value: number) => (Math.abs(value) < SNAP_DISTANCE ? 0 : value);

// One finger on the widget drags it. Two fingers anywhere on the story pinch it (like Instagram):
// it grows or shrinks and follows the point between the fingers. Lifting or adding a finger
// carries on from where the widget is, without a jump.
export function useDragAndPinch(resetKey: string) {
  const [translation] = useState(() => new Animated.ValueXY());
  const [pinchScale] = useState(() => new Animated.Value(1));
  const [guides, setGuides] = useState<AlignmentGuides>(NO_GUIDES);
  const [dragging, setDragging] = useState(false);

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
      startCenter: { x: 0, y: 0 },
      startScale: 1,
      scale: 1,
      // Which edge of the range (or 100%) the scale is resting on, for one haptic per arrival.
      scaleStop: 'none' as 'none' | 'min' | 'max' | 'one',
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

    const settleScale = (raw: number) => {
      let scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw));
      if (Math.abs(scale - 1) < SCALE_SNAP) scale = 1;
      const stop = scale === MIN_SCALE ? 'min' : scale === MAX_SCALE ? 'max' : scale === 1 ? 'one' : 'none';
      if (stop !== gesture.scaleStop && stop !== 'none') hapticSelection();
      gesture.scaleStop = stop;
      return scale;
    };

    const beginSegment = (event: GestureResponderEvent, dx: number, dy: number) => {
      const { touches } = event.nativeEvent;
      gesture.touches = touches.length;
      gesture.baseDx = dx;
      gesture.baseDy = dy;
      gesture.originX = gesture.x;
      gesture.originY = gesture.y;
      if (touches.length >= 2) {
        gesture.startDistance = Math.max(1, touchDistance(touches));
        gesture.startCenter = touchCenter(touches);
        gesture.startScale = gesture.scale;
      }
    };

    const move = (event: GestureResponderEvent, state: PanResponderGestureState) => {
      const { touches } = event.nativeEvent;
      if (touches.length === 0) return;
      if (touches.length !== gesture.touches) beginSegment(event, state.dx, state.dy);

      if (touches.length >= 2) {
        gesture.scale = settleScale((gesture.startScale * touchDistance(touches)) / gesture.startDistance);
        pinchScale.setValue(gesture.scale);
        const center = touchCenter(touches);
        gesture.x = snapToCenter(gesture.originX + center.x - gesture.startCenter.x);
        gesture.y = snapToCenter(gesture.originY + center.y - gesture.startCenter.y);
      } else {
        gesture.x = snapToCenter(gesture.originX + state.dx - gesture.baseDx);
        gesture.y = snapToCenter(gesture.originY + state.dy - gesture.baseDy);
      }
      translation.setValue({ x: gesture.x, y: gesture.y });
      showGuides({ vertical: gesture.x === 0, horizontal: gesture.y === 0 });
    };

    const grant = (event: GestureResponderEvent) => {
      setDragging(true);
      beginSegment(event, 0, 0);
    };

    const end = () => {
      gesture.touches = 0;
      gesture.scaleStop = 'none';
      setDragging(false);
      showGuides(NO_GUIDES);
    };

    const twoFingers = (event: GestureResponderEvent) => event.nativeEvent.touches.length >= 2;

    // On the widget: takes a single finger. Lets the story take over once a second finger lands.
    const widget = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: (event) => twoFingers(event),
      onPanResponderGrant: grant,
      onPanResponderMove: move,
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });

    // On the whole story: claims the touch only when two fingers are down, wherever they are, so a
    // single tap on the background still reaches the background.
    const canvas = PanResponder.create({
      onStartShouldSetPanResponderCapture: twoFingers,
      onMoveShouldSetPanResponderCapture: twoFingers,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: grant,
      onPanResponderMove: move,
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });

    const reset = () => {
      gesture.x = 0;
      gesture.y = 0;
      gesture.scale = 1;
      translation.setValue({ x: 0, y: 0 });
      pinchScale.setValue(1);
    };

    const current = () => ({ x: gesture.x, y: gesture.y, scale: gesture.scale });

    return { panHandlers: widget.panHandlers, canvasHandlers: canvas.panHandlers, reset, current };
  });

  // Layout effect so a newly selected widget never paints at the previous widget's position.
  useLayoutEffect(() => {
    gestures.reset();
  }, [resetKey, gestures]);

  return {
    translation,
    pinchScale,
    guides,
    dragging,
    panHandlers: gestures.panHandlers,
    canvasHandlers: gestures.canvasHandlers,
    currentTransform: gestures.current,
  };
}
