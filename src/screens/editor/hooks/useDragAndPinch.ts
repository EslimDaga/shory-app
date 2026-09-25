import { useEffect, useState } from 'react';
import { Animated, PanResponder, type GestureResponderEvent } from 'react-native';

const MIN_SCALE = 0.45;
const MAX_SCALE = 2.6;

const touchDistance = (event: GestureResponderEvent) => {
  const [first, second] = event.nativeEvent.touches;
  return Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
};

const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

export function useDragAndPinch(resetKey: string) {
  const [translation] = useState(() => new Animated.ValueXY());
  const [pinchScale] = useState(() => new Animated.Value(1));

  const [gestures] = useState(() => {
    const gesture = { touches: 0, baseDx: 0, baseDy: 0, startDistance: 1, startScale: 1, scale: 1 };

    const startPinch = (event: GestureResponderEvent) => {
      gesture.startDistance = touchDistance(event);
      gesture.startScale = gesture.scale;
    };

    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        translation.extractOffset();
        gesture.touches = event.nativeEvent.touches.length;
        gesture.baseDx = 0;
        gesture.baseDy = 0;
        if (gesture.touches >= 2) startPinch(event);
      },
      onPanResponderMove: (event, state) => {
        const touches = event.nativeEvent.touches.length;
        if (touches !== gesture.touches) {
          translation.extractOffset();
          gesture.baseDx = state.dx;
          gesture.baseDy = state.dy;
          gesture.touches = touches;
          if (touches >= 2) startPinch(event);
        }
        if (touches >= 2) {
          gesture.scale = clampScale((gesture.startScale * touchDistance(event)) / gesture.startDistance);
          pinchScale.setValue(gesture.scale);
        } else {
          translation.setValue({ x: state.dx - gesture.baseDx, y: state.dy - gesture.baseDy });
        }
      },
      onPanResponderRelease: () => translation.flattenOffset(),
    });

    const reset = () => {
      gesture.scale = 1;
      translation.setOffset({ x: 0, y: 0 });
      translation.setValue({ x: 0, y: 0 });
      pinchScale.setValue(1);
    };

    return { panHandlers: responder.panHandlers, reset };
  });

  useEffect(() => {
    gestures.reset();
  }, [resetKey, gestures]);

  return { translation, pinchScale, panHandlers: gestures.panHandlers };
}
