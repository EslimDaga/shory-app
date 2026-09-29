import { useEffect } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useDeviceTilt } from '@/components/motion/useDeviceTilt';
import { PLAYER_SIZE } from '@/widgets/PlayerWidget';
import { PlayerShowcase } from './PlayerShowcase';

const STORY_PHOTO = require('../../../../assets/onboarding/cover-waves.jpg');
const STORY_ASPECT = 16 / 9;
const STORY_SEGMENTS = 3;
// The player overhangs the story like a sticker, wider than the card itself.
const PLAYER_TO_CARD = 1.7;
const PLAYER_TOP = 0.6;
const PARALLAX_PX = 8;

export function StoryComposition() {
  const window = useWindowDimensions();
  const cardWidth = Math.min(150, Math.max(108, window.height * 0.16));
  const cardHeight = cardWidth * STORY_ASPECT;
  const playerWidth = cardWidth * PLAYER_TO_CARD;
  const scale = playerWidth / PLAYER_SIZE.width;
  const playerHeight = PLAYER_SIZE.height * scale;
  const playerTop = cardHeight * PLAYER_TOP;
  const height = Math.max(cardHeight, playerTop + playerHeight);

  const reduceMotion = useReducedMotion();
  const tilt = useDeviceTilt();
  const float = useSharedValue(0.5);

  useEffect(() => {
    if (reduceMotion) return;
    float.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float, reduceMotion]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tilt.x.value * PARALLAX_PX * 0.5 },
      { translateY: (float.value - 0.5) * 8 },
      { rotate: '-4deg' },
    ],
  }));
  const playerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tilt.x.value * PARALLAX_PX },
      { translateY: (0.5 - float.value) * 6 },
      { rotate: '2deg' },
    ],
  }));

  return (
    <View style={{ width: playerWidth, height }}>
      <Animated.View
        style={[
          styles.card,
          { width: cardWidth, height: cardHeight, left: (playerWidth - cardWidth) / 2 },
          cardStyle,
        ]}
      >
        <View style={styles.cardClip}>
          <Image source={STORY_PHOTO} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={styles.scrim} />
          <View style={styles.segments}>
            {Array.from({ length: STORY_SEGMENTS }, (_, index) => (
              <View key={index} style={[styles.segment, index === 0 && styles.segmentActive]} />
            ))}
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.player, { top: playerTop, width: playerWidth, height: playerHeight }, playerStyle]}
      >
        <View
          style={{
            width: PLAYER_SIZE.width,
            height: PLAYER_SIZE.height,
            marginLeft: (playerWidth - PLAYER_SIZE.width) / 2,
            marginTop: (playerHeight - PLAYER_SIZE.height) / 2,
            transform: [{ scale }],
          }}
        >
          <PlayerShowcase active />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 0,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0A0A09',
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
  },
  cardClip: { flex: 1, borderRadius: 22, overflow: 'hidden', borderWidth: 3, borderColor: '#FFFFFF' },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  segments: { position: 'absolute', top: 9, left: 9, right: 9, flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.45)' },
  segmentActive: { backgroundColor: '#FFFFFF' },
  player: {
    position: 'absolute',
    left: 0,
    shadowColor: '#0A0A09',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
});
