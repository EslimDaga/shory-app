import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { useStoryClock } from '@/components/motion/StoryClock';

// In the templates' 1080-wide units: how fast the title scrolls and the space between its copies.
const SPEED = 60;
const GAP = 60;
// The title rests on its first letter for a moment before it starts to move.
const HOLD_SECONDS = 1;
// Wider than any title, so the moving copies lay out on one line at their natural width.
const TRACK_WIDTH = 100000;

type Props = { title: string; style: StyleProp<TextStyle>; unit: number };

// A title too long for its row scrolls sideways like Spotify's marquee, wrapping seamlessly onto a
// second copy; one that fits stays put. A still story (photo, thumbnails) shows it ellipsized.
export function MarqueeTitle({ title, style, unit: s }: Props) {
  const clock = useStoryClock();
  const [boxWidth, setBoxWidth] = useState(0);
  const [titleWidth, setTitleWidth] = useState(0);
  const scrolling = clock !== null && boxWidth > 0 && titleWidth > boxWidth;
  const offset = scrolling ? (Math.max(0, clock - HOLD_SECONDS) * SPEED * s) % (titleWidth + GAP * s) : 0;

  return (
    <View style={styles.box} onLayout={(event) => setBoxWidth(event.nativeEvent.layout.width)}>
      {/* Gives the row its height and is the title screen readers get; hidden while it scrolls. */}
      <Text numberOfLines={1} style={[style, scrolling && styles.hidden]}>
        {title}
      </Text>
      <View
        aria-hidden
        pointerEvents="none"
        style={[styles.track, { transform: [{ translateX: -offset }] }, !scrolling && styles.hidden]}
      >
        <Text style={style} onLayout={(event) => setTitleWidth(event.nativeEvent.layout.width)}>
          {title}
        </Text>
        <Text style={[style, { marginLeft: GAP * s }]}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'stretch', overflow: 'hidden' },
  track: { position: 'absolute', top: 0, left: 0, width: TRACK_WIDTH, flexDirection: 'row' },
  hidden: { opacity: 0 },
});
