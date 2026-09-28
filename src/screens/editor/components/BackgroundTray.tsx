import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  CameraIcon,
  CheckIcon,
  DiceIcon,
  GalleryIcon,
  PlusIcon,
  SparkleIcon,
  VideoIcon,
} from '@/components/Icons';
import {
  AUTO_BACKGROUND_ID,
  createMagicBackground,
  CUSTOM_BACKGROUND_ID,
  GRADIENT_PRESETS,
} from '@/constants/storyBackgrounds';
import { strings } from '@/i18n/es';
import type { PhotoSource } from '@/services/media/photoLibrary';
import { editorColors } from '@/theme/colors';
import type { GradientBackground, StoryBackground } from '@/types/storyBackground';
import { isLightColor, mixColors } from '@/utils/color';
import { Tray } from './Tray';

type Props = {
  autoBackground: GradientBackground;
  customBackground: GradientBackground | null;
  selected: StoryBackground;
  // Colors extracted from the cover and the chosen photo, offered first as "Magic" swatches.
  magicColors: string[];
  onPickPhoto: (source: PhotoSource) => void;
  // Left out where a video background isn't available, which hides its tile.
  onPickVideo?: () => void;
  onSelectGradient: (background: GradientBackground) => void;
  onRandom: () => void;
  onOpenColorPicker: () => void;
};

const SWATCH_SIZE = 40;
const RAINBOW = ['#FF5E5E', '#FFC53D', '#7BE05A', '#3CC8F4', '#7B61FF', '#FF5EC4'];

export function BackgroundTray({
  autoBackground,
  customBackground,
  selected,
  magicColors,
  onPickPhoto,
  onPickVideo,
  onSelectGradient,
  onRandom,
  onOpenColorPicker,
}: Props) {
  const gradients = [autoBackground, ...(customBackground ? [customBackground] : []), ...GRADIENT_PRESETS];

  return (
    <Tray>
      <IconTile label={strings.editor.pickFromLibrary} onPress={() => onPickPhoto('library')}>
        <GalleryIcon />
      </IconTile>
      <IconTile label={strings.editor.takePhoto} onPress={() => onPickPhoto('camera')}>
        <CameraIcon />
      </IconTile>
      {onPickVideo && (
        <IconTile label={strings.editor.pickVideo} onPress={onPickVideo}>
          <VideoIcon />
        </IconTile>
      )}
      {magicColors.length > 0 && (
        <>
          <View style={styles.divider} />
          <View
            style={styles.magicMark}
            accessible
            accessibilityLabel={strings.editor.magicColors}
            accessibilityRole="text"
          >
            <SparkleIcon size={16} color={editorColors.accent} />
          </View>
          {magicColors.map((color, index) => {
            const magic = createMagicBackground(color);
            return (
              <GradientSwatch
                key={magic.id}
                gradient={magic}
                label={strings.editor.magicColor(index + 1)}
                active={selected.kind === 'gradient' && selected.id === magic.id}
                onPress={() => onSelectGradient(magic)}
              />
            );
          })}
        </>
      )}
      <View style={styles.divider} />
      <IconTile label={strings.editor.randomColor} onPress={onRandom}>
        <DiceIcon />
      </IconTile>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.editor.customColor}
        onPress={onOpenColorPicker}
        style={({ pressed }) => [styles.swatch, pressed && styles.pressed]}
      >
        <RainbowRing />
        <View style={styles.plus}>
          <PlusIcon size={14} color={editorColors.text} />
        </View>
      </Pressable>
      <View style={styles.divider} />
      {gradients.map((gradient) => (
        <GradientSwatch
          key={gradient.id}
          gradient={gradient}
          label={swatchLabel(gradient.id)}
          active={selected.kind === 'gradient' && selected.id === gradient.id}
          onPress={() => onSelectGradient(gradient)}
        />
      ))}
    </Tray>
  );
}

function swatchLabel(id: string): string {
  if (id === AUTO_BACKGROUND_ID) return strings.editor.autoColor;
  if (id === CUSTOM_BACKGROUND_ID) return strings.editor.customColorSwatch;
  return strings.editor.backgroundPreset(strings.editor.backgroundPresetNames[id] ?? id);
}

function IconTile({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

function RainbowRing() {
  return (
    <Svg width={SWATCH_SIZE} height={SWATCH_SIZE}>
      <Defs>
        <LinearGradient id="swatch-rainbow" x1="0" y1="0" x2="1" y2="1">
          {RAINBOW.map((color, index) => (
            <Stop key={color} offset={index / (RAINBOW.length - 1)} stopColor={color} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width={SWATCH_SIZE} height={SWATCH_SIZE} rx={SWATCH_SIZE / 2} fill="url(#swatch-rainbow)" />
    </Svg>
  );
}

function GradientSwatch({
  gradient,
  label,
  active,
  onPress,
}: {
  gradient: GradientBackground;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const gradientId = `swatch-${gradient.id}`;
  const checkColor = isLightColor(mixColors(gradient.top, gradient.bottom, 0.5)) ? '#0A0A09' : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-selected={active}
      onPress={onPress}
      style={({ pressed }) => [styles.swatch, active && styles.active, pressed && styles.pressed]}
    >
      <Svg width={SWATCH_SIZE} height={SWATCH_SIZE}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={gradient.top} />
            <Stop offset="1" stopColor={gradient.bottom} />
          </LinearGradient>
        </Defs>
        <Rect width={SWATCH_SIZE} height={SWATCH_SIZE} rx={SWATCH_SIZE / 2} fill={`url(#${gradientId})`} />
        <Rect
          x={0.5}
          y={0.5}
          width={SWATCH_SIZE - 1}
          height={SWATCH_SIZE - 1}
          rx={SWATCH_SIZE / 2 - 0.5}
          fill="none"
          stroke={editorColors.hairline}
        />
      </Svg>
      {active && (
        <View style={styles.check} pointerEvents="none">
          <CheckIcon size={20} color={checkColor} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  divider: { width: StyleSheet.hairlineWidth, height: 36, backgroundColor: editorColors.hairline },
  tile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: editorColors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  active: { borderColor: editorColors.accent },
  plus: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(10, 10, 10, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  magicMark: { width: 20, alignItems: 'center', justifyContent: 'center' },
});
