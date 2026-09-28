import { useMemo, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { editorColors } from '@/theme/colors';

type Props = {
  value: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
  step?: number;
};

const THUMB = 22;
const TRACK = 4;

export function Slider({ value, onChange, accessibilityLabel, step = 0.05 }: Props) {
  const [width, setWidth] = useState(0);
  const clamp = (next: number) => Math.min(1, Math.max(0, next));

  const responder = useMemo(() => {
    const handle = (event: GestureResponderEvent) => {
      if (width <= 0) return;
      onChange(clamp((event.nativeEvent.locationX - THUMB / 2) / (width - THUMB)));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: handle,
      onPanResponderMove: handle,
    });
  }, [width, onChange]);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const thumbLeft = value * Math.max(0, width - THUMB);

  return (
    <View
      style={styles.root}
      onLayout={onLayout}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) =>
        onChange(clamp(value + (event.nativeEvent.actionName === 'increment' ? step : -step)))
      }
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={styles.track}>
        <View style={[styles.fill, { width: thumbLeft + THUMB / 2 }]} />
      </View>
      <View pointerEvents="none" style={[styles.thumb, { left: thumbLeft }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: THUMB + 12, justifyContent: 'center' },
  track: {
    height: TRACK,
    borderRadius: TRACK / 2,
    marginHorizontal: THUMB / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
  },
  fill: { position: 'absolute', left: -THUMB / 2, top: 0, bottom: 0, backgroundColor: editorColors.accent },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
