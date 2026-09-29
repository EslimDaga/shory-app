import { useEffect, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { useDeviceTilt, type DeviceTilt } from '@/components/motion/useDeviceTilt';
import { SourceLogo } from '@/components/SourceLogo';
import { brand } from '@/theme/colors';
import type { MusicSource } from '@/types/music';
import { hapticSelection } from '@/utils/haptics';
import { PLAYER_SIZE } from '@/widgets/PlayerWidget';
import { PlayerShowcase } from './PlayerShowcase';

const COVERS = {
  stripes: require('../../../../assets/onboarding/cover-stripes.jpg'),
  dots: require('../../../../assets/onboarding/cover-dots.jpg'),
  sun: require('../../../../assets/onboarding/cover-sun.jpg'),
  waves: require('../../../../assets/onboarding/cover-waves.jpg'),
  blob: require('../../../../assets/onboarding/cover-blob.jpg'),
};
const APP_ICON = require('../../../../assets/icon.png');

type ItemKind =
  | { type: 'cover'; cover: keyof typeof COVERS }
  | { type: 'badge'; source: MusicSource }
  | { type: 'icon' }
  | { type: 'levels' }
  | { type: 'player' };

type CollageItem = ItemKind & {
  id: string;
  x: number;
  y: number;
  size: number;
  rotate: number;
  depth: number;
};

const ITEMS: CollageItem[] = [
  { id: 'c1', type: 'cover', cover: 'stripes', x: 0.14, y: 0.17, size: 0.22, rotate: -12, depth: 0.7 },
  { id: 'b1', type: 'badge', source: 'spotify', x: 0.37, y: 0.08, size: 0.12, rotate: 8, depth: 1.1 },
  { id: 'c2', type: 'cover', cover: 'dots', x: 0.66, y: 0.12, size: 0.19, rotate: 10, depth: 0.5 },
  { id: 'i1', type: 'icon', x: 0.88, y: 0.3, size: 0.15, rotate: -8, depth: 1.2 },
  { id: 'c3', type: 'cover', cover: 'sun', x: 0.13, y: 0.47, size: 0.2, rotate: 9, depth: 0.9 },
  { id: 'b2', type: 'badge', source: 'apple-music', x: 0.85, y: 0.58, size: 0.12, rotate: -10, depth: 1.0 },
  { id: 'l1', type: 'levels', x: 0.3, y: 0.98, size: 0.19, rotate: -6, depth: 1.2 },
  { id: 'c4', type: 'cover', cover: 'waves', x: 0.86, y: 0.84, size: 0.19, rotate: 7, depth: 0.8 },
  { id: 'p1', type: 'player', x: 0.5, y: 0.66, size: 0.8, rotate: -3, depth: 0.35 },
  { id: 'b3', type: 'badge', source: 'youtube-music', x: 0.08, y: 0.9, size: 0.11, rotate: 12, depth: 1.1 },
  { id: 'c5', type: 'cover', cover: 'blob', x: 0.93, y: 0.07, size: 0.14, rotate: -14, depth: 0.6 },
];

const ENTER_STAGGER_MS = 55;
const PARALLAX_PX = 16;
const EXIT_DISTANCE = 520;
// The player is the hero: it always renders above every sticker, whatever their depth.
const PLAYER_Z = 100;

type Props = {
  width: number;
  height: number;
  active: boolean;
  leaving: SharedValue<number>;
};

export function FloatingCollage({ width, height, active, leaving }: Props) {
  const tilt = useDeviceTilt();

  const ordered = [...ITEMS].sort(
    (a, b) => Math.hypot(a.x - 0.5, a.y - 0.5) - Math.hypot(b.x - 0.5, b.y - 0.5),
  );

  return (
    <View style={{ width, height }} pointerEvents="box-none">
      {ordered.map((item, index) => (
        <FloatingItem
          key={item.id}
          item={item}
          order={index}
          width={width}
          height={height}
          tilt={tilt}
          active={active}
          leaving={leaving}
        >
          <ItemContent item={item} size={item.size * width} active={active} />
        </FloatingItem>
      ))}
    </View>
  );
}

function FloatingItem({
  item,
  order,
  width,
  height,
  tilt,
  active,
  leaving,
  children,
}: {
  item: CollageItem;
  order: number;
  width: number;
  height: number;
  tilt: DeviceTilt;
  active: boolean;
  leaving: SharedValue<number>;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const enter = useSharedValue(0);
  const float = useSharedValue(0.5);
  const press = useSharedValue(1);

  const size = item.size * width;
  const centerX = item.x * width;
  const centerY = item.y * height;
  const fromCenterX = width / 2 - centerX;
  const fromCenterY = height / 2 - centerY;
  const distance = Math.hypot(fromCenterX, fromCenterY) || 1;
  const phase = (order * 0.37) % 1;
  const floatMs = 2600 + ((order * 331) % 1500);
  const floatAmplitude = 5 + item.depth * 4;

  useEffect(() => {
    if (!active) return;
    enter.value = withDelay(
      order * ENTER_STAGGER_MS,
      withSpring(1, { damping: 19, stiffness: 120, mass: 0.9 }),
    );
    if (reduceMotion) return;
    float.value = phase;
    float.value = withDelay(
      order * ENTER_STAGGER_MS + 500,
      withRepeat(
        withTiming(phase > 0.5 ? 0 : 1, { duration: floatMs, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [active, enter, float, order, phase, floatMs, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    const bob = (float.value - 0.5) * 2;
    const out = leaving.value;
    return {
      opacity: Math.min(1, enter.value * 1.6) * (1 - out),
      transform: [
        {
          translateX:
            (1 - enter.value) * fromCenterX +
            tilt.x.value * PARALLAX_PX * item.depth -
            (out * EXIT_DISTANCE * fromCenterX) / distance,
        },
        {
          translateY:
            (1 - enter.value) * fromCenterY +
            bob * floatAmplitude +
            tilt.y.value * PARALLAX_PX * item.depth -
            (out * EXIT_DISTANCE * fromCenterY) / distance,
        },
        { rotate: `${item.rotate * enter.value + bob * 2.2 + out * item.rotate * 1.5}deg` },
        { scale: interpolate(enter.value, [0, 1], [0.25, 1]) * press.value * (1 + out * 0.25) },
      ],
    };
  });

  const onPress = () => {
    hapticSelection();
    press.value = withSequence(
      withSpring(1.08, { damping: 18, stiffness: 400 }),
      withSpring(1, { damping: 22, stiffness: 200 }),
    );
  };

  return (
    <Animated.View
      style={[
        styles.item,
        {
          left: centerX - size / 2,
          top: centerY - size / 2,
          width: size,
          zIndex: item.type === 'player' ? PLAYER_Z : Math.round(item.depth * 10),
        },
        animatedStyle,
      ]}
    >
      <Pressable onPress={onPress} accessible={false}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

function ItemContent({ item, size, active }: { item: CollageItem; size: number; active: boolean }) {
  if (item.type === 'cover') {
    return (
      <View style={[styles.shadow, { borderRadius: size * 0.16 }]}>
        <Image
          source={COVERS[item.cover]}
          style={[styles.cover, { width: size, height: size, borderRadius: size * 0.16 }]}
        />
      </View>
    );
  }
  if (item.type === 'badge') {
    return (
      <View style={[styles.badge, styles.shadow, { width: size, height: size, borderRadius: size / 2 }]}>
        <SourceLogo source={item.source} size={size * 0.62} />
      </View>
    );
  }
  if (item.type === 'icon') {
    return (
      <View style={[styles.shadow, { borderRadius: size * 0.23 }]}>
        <Image source={APP_ICON} style={{ width: size, height: size, borderRadius: size * 0.23 }} />
      </View>
    );
  }
  if (item.type === 'levels') {
    return <LevelsSticker width={size} />;
  }
  const scale = size / PLAYER_SIZE.width;
  return (
    <View style={[styles.shadow, { width: size, height: PLAYER_SIZE.height * scale }]}>
      <View
        style={{
          width: PLAYER_SIZE.width,
          height: PLAYER_SIZE.height,
          marginLeft: (size - PLAYER_SIZE.width) / 2,
          marginTop: (PLAYER_SIZE.height * scale - PLAYER_SIZE.height) / 2,
          transform: [{ scale }],
        }}
      >
        <PlayerShowcase active={active} />
      </View>
    </View>
  );
}

const LEVELS = [0.35, 0.6, 0.85, 0.5, 1, 0.7, 0.4];

function LevelsSticker({ width }: { width: number }) {
  const height = width * 0.5;
  const barWidth = width * 0.07;
  const gap = (width * 0.62 - barWidth * LEVELS.length) / (LEVELS.length - 1);
  const startX = width * 0.19;
  return (
    <View style={[styles.levels, styles.shadow, { width, height, borderRadius: height / 2 }]}>
      <Svg width={width} height={height}>
        {LEVELS.map((level, index) => {
          const barHeight = height * 0.62 * level;
          return (
            <Rect
              key={index}
              x={startX + index * (barWidth + gap)}
              y={(height - barHeight) / 2}
              width={barWidth}
              height={barHeight}
              rx={barWidth / 2}
              fill={brand[950]}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  shadow: {
    shadowColor: '#0A0A09',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  cover: { borderWidth: 3, borderColor: '#FFFFFF' },
  badge: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  levels: { backgroundColor: brand[600] },
});
