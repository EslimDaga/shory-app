import { useCallback, useMemo, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BottomSheet } from '@/components/BottomSheet';
import { DiceIcon } from '@/components/Icons';
import { PillButton } from '@/components/PillButton';
import { gradientBottom } from '@/constants/storyBackgrounds';
import { strings } from '@/i18n/es';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { hexToHsv, hsvToHex, randomGradientColors, type Hsv } from '@/utils/color';
import { hapticSelection } from '@/utils/haptics';

type Props = {
  visible: boolean;
  initialColor: string;
  onClose: () => void;
  onApply: (color: string) => void;
};

const SHEET_PADDING = 22;
const SQUARE_HEIGHT = 196;
const HUE_HEIGHT = 30;
const THUMB = 28;
const PAD_RADIUS = 20;
const HUE_STOPS = ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'];
const BRIGHTNESS_STEP = 0.1;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function ColorPickerSheet({ visible, initialColor, onClose, onApply }: Props) {
  const [lastVisible, setLastVisible] = useState(visible);
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(initialColor));

  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible) setHsv(hexToHsv(initialColor));
  }

  const color = hsvToHex(hsv);
  // Stable, so the drag responders below aren't rebuilt on every move.
  const changeSaturationValue = useCallback(
    (s: number, v: number) => setHsv((current) => ({ ...current, s, v })),
    [],
  );
  const changeHue = useCallback((h: number) => setHsv((current) => ({ ...current, h })), []);

  return (
    <BottomSheet visible={visible} onClose={onClose} tone="dark">
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">
          {strings.editor.colorPickerTitle}
        </Text>
        <View style={styles.previewRow}>
          <PreviewSwatch color={color} />
          <Text style={styles.hex}>{color.toUpperCase()}</Text>
        </View>
      </View>

      <SaturationValuePad hsv={hsv} onChange={changeSaturationValue} />
      <HueSlider hue={hsv.h} onChange={changeHue} />

      <View style={styles.actions}>
        <View style={styles.flex}>
          <PillButton
            label={strings.editor.colorPickerShuffle}
            variant="light"
            icon={<DiceIcon size={20} color="#0A0A09" />}
            onPress={() => {
              hapticSelection();
              setHsv(hexToHsv(randomGradientColors().top));
            }}
          />
        </View>
        <View style={styles.flex}>
          <PillButton label={strings.editor.colorPickerApply} variant="lime" onPress={() => onApply(color)} />
        </View>
      </View>
    </BottomSheet>
  );
}

function usePadWidth() {
  const window = useWindowDimensions();
  return window.width - SHEET_PADDING * 2;
}

// `onMove` must be stable (useCallback): a new responder mid-drag would restart the gesture.
function useDragResponder(onMove: (x: number, y: number) => void) {
  return useMemo(() => {
    const handle = (event: GestureResponderEvent) =>
      onMove(event.nativeEvent.locationX, event.nativeEvent.locationY);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: handle,
      onPanResponderMove: handle,
    });
  }, [onMove]);
}

function SaturationValuePad({ hsv, onChange }: { hsv: Hsv; onChange: (s: number, v: number) => void }) {
  const width = usePadWidth();
  const responder = useDragResponder(
    useCallback(
      (x: number, y: number) => onChange(clamp(x / width), 1 - clamp(y / SQUARE_HEIGHT)),
      [onChange, width],
    ),
  );
  const hueColor = hsvToHex({ h: hsv.h, s: 1, v: 1 });

  // Screen readers adjust the pad's vertical axis (brightness); the hue slider below does the rest.
  return (
    <View
      style={[styles.pad, { width, height: SQUARE_HEIGHT }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={strings.editor.colorPickerBrightness}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(hsv.v * 100)}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const step = event.nativeEvent.actionName === 'increment' ? BRIGHTNESS_STEP : -BRIGHTNESS_STEP;
        onChange(hsv.s, clamp(hsv.v + step));
      }}
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={width} height={SQUARE_HEIGHT}>
          <Defs>
            <LinearGradient id="pad-white" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id="pad-black" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width={width} height={SQUARE_HEIGHT} rx={PAD_RADIUS} fill={hueColor} />
          <Rect width={width} height={SQUARE_HEIGHT} rx={PAD_RADIUS} fill="url(#pad-white)" />
          <Rect width={width} height={SQUARE_HEIGHT} rx={PAD_RADIUS} fill="url(#pad-black)" />
        </Svg>
        <View
          style={[
            styles.thumb,
            {
              left: hsv.s * width - THUMB / 2,
              top: (1 - hsv.v) * SQUARE_HEIGHT - THUMB / 2,
              backgroundColor: hsvToHex(hsv),
            },
          ]}
        />
      </View>
    </View>
  );
}

function HueSlider({ hue, onChange }: { hue: number; onChange: (hue: number) => void }) {
  const width = usePadWidth();
  // Same mapping as the thumb below: its center sits under the finger across the whole track.
  const responder = useDragResponder(
    useCallback((x: number) => onChange(clamp((x - THUMB / 2) / (width - THUMB)) * 359.9), [onChange, width]),
  );

  return (
    <View
      style={[styles.hue, { width }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={strings.editor.colorPickerHue}
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(hue)}
      onAccessibilityAction={(event) => {
        const step = event.nativeEvent.actionName === 'increment' ? 15 : -15;
        onChange((hue + step + 360) % 360);
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={width} height={HUE_HEIGHT}>
          <Defs>
            <LinearGradient id="hue" x1="0" y1="0" x2="1" y2="0">
              {HUE_STOPS.map((stop, index) => (
                <Stop key={`${stop}-${index}`} offset={index / (HUE_STOPS.length - 1)} stopColor={stop} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect width={width} height={HUE_HEIGHT} rx={HUE_HEIGHT / 2} fill="url(#hue)" />
        </Svg>
        <View
          style={[
            styles.thumb,
            {
              left: (hue / 360) * (width - THUMB),
              top: (HUE_HEIGHT - THUMB) / 2,
              backgroundColor: hsvToHex({ h: hue, s: 1, v: 1 }),
            },
          ]}
        />
      </View>
    </View>
  );
}

function PreviewSwatch({ color }: { color: string }) {
  return (
    <Svg width={34} height={34}>
      <Defs>
        <LinearGradient id="picker-preview" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} />
          <Stop offset="1" stopColor={gradientBottom(color)} />
        </LinearGradient>
      </Defs>
      <Rect width={34} height={34} rx={17} fill="url(#picker-preview)" stroke={editorColors.hairline} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontFamily: fonts.sansExtraBold, fontSize: 24, letterSpacing: -0.4, color: editorColors.text },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hex: { fontFamily: fonts.mono, fontSize: 14, color: editorColors.textMuted },
  pad: { borderRadius: PAD_RADIUS },
  hue: { height: HUE_HEIGHT, marginTop: 18, justifyContent: 'center' },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  flex: { flex: 1 },
});
