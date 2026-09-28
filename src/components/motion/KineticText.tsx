import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { brand } from '@/theme/colors';

type Props = {
  text: string;
  style: StyleProp<TextStyle>;
  highlight?: string;
  delay?: number;
  stagger?: number;
  align?: 'center' | 'left';
};

const WORD_MS = 520;
const WORD_RISE = 18;
const HIGHLIGHT_MS = 520;
const easeOut = Easing.out(Easing.cubic);

export function KineticText({ text, style, highlight, delay = 0, stagger = 55, align = 'center' }: Props) {
  const words = text.split(' ');
  const flat = StyleSheet.flatten(style);
  const fontSize = flat?.fontSize ?? 16;

  return (
    <View
      style={[
        styles.row,
        { justifyContent: align === 'center' ? 'center' : 'flex-start', columnGap: fontSize * 0.26 },
      ]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={text}
    >
      {words.map((word, index) => (
        <Word
          key={`${word}-${index}`}
          word={word}
          style={style}
          fontSize={fontSize}
          delay={delay + index * stagger}
          highlightDelay={
            highlight !== undefined && word.replace(/[.,!?¿¡]/g, '') === highlight
              ? delay + words.length * stagger + 120
              : null
          }
        />
      ))}
    </View>
  );
}

// Each word drives its own shared values instead of a layout `entering` animation: nested
// entering animations can get stuck at their initial frame while the parent screen is itself
// sliding in, which left the first words of a title invisible.
function Word({
  word,
  style,
  fontSize,
  delay,
  highlightDelay,
}: {
  word: string;
  style: StyleProp<TextStyle>;
  fontSize: number;
  delay: number;
  highlightDelay: number | null;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const sweep = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(delay, withTiming(1, { duration: WORD_MS, easing: easeOut }));
    if (highlightDelay !== null) {
      sweep.value = withDelay(highlightDelay, withTiming(1, { duration: HIGHLIGHT_MS, easing: easeOut }));
    }
  }, [delay, highlightDelay, progress, sweep, reduceMotion]);

  const wordStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * WORD_RISE }],
  }));
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: sweep.value }] }));

  return (
    <Animated.View style={wordStyle}>
      {highlightDelay !== null && (
        <Animated.View
          style={[styles.highlight, { height: fontSize * 0.36, bottom: fontSize * 0.08 }, sweepStyle]}
        />
      )}
      <Text style={style} importantForAccessibility="no">
        {word}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  highlight: {
    position: 'absolute',
    left: -3,
    right: -3,
    borderRadius: 6,
    backgroundColor: brand[600],
    transformOrigin: 'left center',
  },
});
