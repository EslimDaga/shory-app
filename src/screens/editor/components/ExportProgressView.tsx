import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { CloseIcon } from '@/components/Icons';
import { strings } from '@/i18n/es';
import { brand, editorColors } from '@/theme/colors';
import { STORY_ASPECT } from '@/theme/layout';
import { fonts } from '@/theme/typography';

type Props = {
  progress: number;
  previewUri: string | null;
  onCancel: () => void;
};

const FRAME_GAP = 10;
const STROKE = 5;
const RADIUS = 30;

// A rounded rectangle traced clockwise from the middle of its top edge, so the progress ring
// fills like a clock hand rather than starting from a corner.
function ringPath(width: number, height: number, radius: number) {
  const inset = STROKE / 2;
  const left = inset;
  const top = inset;
  const right = width - inset;
  const bottom = height - inset;
  const r = radius - inset;
  return [
    `M ${width / 2} ${top}`,
    `H ${right - r}`,
    `A ${r} ${r} 0 0 1 ${right} ${top + r}`,
    `V ${bottom - r}`,
    `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `H ${left + r}`,
    `A ${r} ${r} 0 0 1 ${left} ${bottom - r}`,
    `V ${top + r}`,
    `A ${r} ${r} 0 0 1 ${left + r} ${top}`,
    'Z',
  ].join(' ');
}

function ringLength(width: number, height: number, radius: number) {
  const r = radius - STROKE / 2;
  const straight = 2 * (width - STROKE - 2 * r) + 2 * (height - STROKE - 2 * r);
  return straight + 2 * Math.PI * r;
}

// Full-screen export state: the story being rendered, a progress ring tracing its frame and the
// percentage. It covers the editor (which keeps rendering underneath for the recorder).
export function ExportProgressView({ progress, previewUri, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [area, setArea] = useState({ width: 0, height: 0 });
  const percent = Math.min(100, Math.round(progress * 100));

  const maxWidth = Math.min(window.width * 0.62, 300);
  const frameWidth = Math.max(
    0,
    Math.min(maxWidth, (area.height - FRAME_GAP * 2) / STORY_ASPECT + FRAME_GAP * 2),
  );
  const frameHeight = (frameWidth - FRAME_GAP * 2) * STORY_ASPECT + FRAME_GAP * 2;
  const length = ringLength(frameWidth, frameHeight, RADIUS);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea({ width, height });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.editor.cancel}
        onPress={onCancel}
        hitSlop={12}
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}
      >
        <CloseIcon size={24} color={editorColors.text} />
      </Pressable>

      <Text
        style={styles.percent}
        accessibilityRole="progressbar"
        accessibilityValue={{ now: percent, min: 0, max: 100 }}
      >
        {percent}%
      </Text>
      <Text style={styles.title}>{strings.editor.exporting.title}</Text>
      <Text style={styles.subtitle}>{strings.editor.exporting.keepOpen}</Text>

      <View style={styles.stage} onLayout={onLayout}>
        {frameWidth > 0 && (
          <View style={{ width: frameWidth, height: frameHeight }}>
            <Svg width={frameWidth} height={frameHeight} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="export-ring" x1="0" y1="0" x2="0.4" y2="1">
                  <Stop offset="0" stopColor={brand[400]} />
                  <Stop offset="1" stopColor={brand[700]} />
                </LinearGradient>
              </Defs>
              <Path
                d={ringPath(frameWidth, frameHeight, RADIUS)}
                stroke={editorColors.surfaceRaised}
                strokeWidth={STROKE}
                fill="none"
              />
              <Path
                d={ringPath(frameWidth, frameHeight, RADIUS)}
                stroke="url(#export-ring)"
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${length * progress} ${length}`}
              />
            </Svg>
            <View style={[styles.preview, { margin: FRAME_GAP, borderRadius: RADIUS - FRAME_GAP + 2 }]}>
              {previewUri && <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFill} />}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: editorColors.background,
    alignItems: 'center',
  },
  close: { alignSelf: 'flex-start', marginLeft: 20, padding: 4 },
  pressed: { opacity: 0.6 },
  percent: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 44,
    letterSpacing: -1,
    color: editorColors.text,
    fontVariant: ['tabular-nums'],
    marginTop: 12,
  },
  title: { fontFamily: fonts.sansSemiBold, fontSize: 17, color: editorColors.text, marginTop: 2 },
  subtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: editorColors.textMuted,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  stage: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  preview: { flex: 1, overflow: 'hidden', backgroundColor: editorColors.surface },
});
