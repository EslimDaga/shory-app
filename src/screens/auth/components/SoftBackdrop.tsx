import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

const BACKGROUND = '#F6F7F2';
const OVERSCAN = 0.35;

const BLOBS = [
  { id: 'lime', x: 0.86, y: 0.2, rx: 0.7, ry: 0.28, color: '#DAFF3E', opacity: 0.55, drift: 0.09, ms: 7000 },
  { id: 'sky', x: 0.12, y: 0.34, rx: 0.75, ry: 0.3, color: '#BFE3FF', opacity: 0.75, drift: 0.07, ms: 8600 },
  { id: 'mint', x: 0.92, y: 0.72, rx: 0.6, ry: 0.26, color: '#B8F5D8', opacity: 0.7, drift: 0.08, ms: 7800 },
  { id: 'haze', x: 0.2, y: 0.9, rx: 0.8, ry: 0.22, color: '#E8FF8A', opacity: 0.45, drift: 0.06, ms: 9400 },
];

type Blob = (typeof BLOBS)[number];

export function SoftBackdrop() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={[StyleSheet.absoluteFill, styles.base]} pointerEvents="none">
      {BLOBS.map((blob, index) => (
        <DriftingBlob key={blob.id} blob={blob} index={index} width={width} height={height} />
      ))}
    </View>
  );
}

function DriftingBlob({
  blob,
  index,
  width,
  height,
}: {
  blob: Blob;
  index: number;
  width: number;
  height: number;
}) {
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    drift.value = withDelay(
      index * 400,
      withRepeat(withTiming(1, { duration: blob.ms, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [blob.ms, drift, index, reduceMotion]);

  const style = useAnimatedStyle(() => {
    const angle = drift.value * Math.PI * 2;
    return {
      transform: [
        { translateX: Math.cos(angle + index) * blob.drift * width },
        { translateY: Math.sin(angle + index) * blob.drift * height * 0.5 },
        { scale: 1 + Math.sin(angle) * 0.06 },
      ],
    };
  });

  const gradientId = `blob-${blob.id}`;
  const padX = width * OVERSCAN;
  const padY = height * OVERSCAN;
  const cx = blob.x * width + padX;
  const cy = blob.y * height + padY;
  return (
    <Animated.View
      style={[
        styles.layer,
        { left: -padX, top: -padY, width: width + padX * 2, height: height + padY * 2 },
        style,
      ]}
    >
      <Svg width={width + padX * 2} height={height + padY * 2}>
        <Defs>
          <RadialGradient
            id={gradientId}
            cx={cx}
            cy={cy}
            rx={blob.rx * width}
            ry={blob.ry * height}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={blob.color} stopOpacity={blob.opacity} />
            <Stop offset="1" stopColor={blob.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={cx} cy={cy} rx={blob.rx * width} ry={blob.ry * height} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: BACKGROUND, overflow: 'hidden' },
  layer: { position: 'absolute' },
});
