import { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { CloseIcon, DotsIcon, HeartIcon, SendIcon } from '@/components/Icons';
import { strings } from '@/i18n/es';
import { fonts } from '@/theme/typography';

type Props = {
  visible: boolean;
  width: number;
  height: number;
  name: string;
  avatarUrl: string | null;
};

// Instagram's own scrims behind its header (top) and reply bar (bottom), as a share of the story.
const TOP_SCRIM = 0.16;
const BOTTOM_SCRIM = 0.13;
const SEGMENTS = 3;
const FADE_MS = 160;
const INK = '#FFFFFF';

// A preview of Instagram's story chrome, shown while the widget moves so it's never placed
// under the avatar, the progress bar or the reply field.
export function InstagramSafeArea({ visible, width, height, name, avatarUrl }: Props) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [mounted, setMounted] = useState(visible);

  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: FADE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, opacity]);

  if (!mounted) return null;

  const unit = width / 100;
  const avatar = unit * 8.2;
  const icon = unit * 5.6;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="ig-top" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="ig-bottom" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.6} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height * TOP_SCRIM} fill="url(#ig-top)" />
        <Rect
          y={height * (1 - BOTTOM_SCRIM)}
          width={width}
          height={height * BOTTOM_SCRIM}
          fill="url(#ig-bottom)"
        />
      </Svg>

      <View style={[styles.segments, { top: height * 0.012, left: unit * 2, right: unit * 2 }]}>
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <View key={index} style={[styles.segment, index === 0 && styles.segmentActive]} />
        ))}
      </View>

      <View style={[styles.header, { top: height * 0.028, left: unit * 3, right: unit * 3, height: avatar }]}>
        <View style={[styles.avatar, { width: avatar, height: avatar, borderRadius: avatar / 2 }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} />
          ) : (
            <Text style={[styles.initial, { fontSize: avatar * 0.42 }]}>
              {Array.from(name.trim())[0]?.toUpperCase() ?? ''}
            </Text>
          )}
        </View>
        <Text style={[styles.name, { fontSize: unit * 3.6 }]} numberOfLines={1}>
          {name}
          <Text style={styles.time}>{`  ${strings.editor.safeArea.now}`}</Text>
        </Text>
        <DotsIcon size={icon} color={INK} />
        <CloseIcon size={icon} color={INK} />
      </View>

      {/* Instagram's reply row: a slim pill close to the bottom edge, as it shows on the phone. */}
      <View
        style={[
          styles.footer,
          { bottom: height * 0.018, left: unit * 3.5, right: unit * 3.5, gap: unit * 3.5 },
        ]}
      >
        <View
          style={[
            styles.reply,
            { height: unit * 8.2, borderRadius: unit * 4.1, paddingHorizontal: unit * 4 },
          ]}
        >
          <Text style={[styles.replyText, { fontSize: unit * 3.3 }]} numberOfLines={1}>
            {strings.editor.safeArea.reply}
          </Text>
        </View>
        <HeartIcon size={unit * 5.4} color={INK} />
        <SendIcon size={unit * 5.4} color={INK} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  segments: { position: 'absolute', flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 2, borderRadius: 1, backgroundColor: 'rgba(255, 255, 255, 0.45)' },
  segmentActive: { backgroundColor: INK },
  header: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: INK,
  },
  initial: { fontFamily: fonts.sansExtraBold, color: INK },
  name: { flex: 1, fontFamily: fonts.sansSemiBold, color: INK },
  time: { fontFamily: fonts.sansMedium, color: 'rgba(255, 255, 255, 0.7)' },
  footer: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  reply: {
    flex: 1,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  replyText: { fontFamily: fonts.sansMedium, color: INK },
});
