import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { CameraIcon, GalleryIcon } from '@/components/Icons';
import { AUTO_BACKGROUND_ID, GRADIENT_PRESETS } from '@/constants/storyBackgrounds';
import { strings } from '@/i18n/es';
import type { PhotoSource } from '@/services/media/photoLibrary';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import type { GradientBackground, StoryBackground } from '@/types/storyBackground';
import { Tray } from './Tray';

type Props = {
  autoBackground: GradientBackground;
  selected: StoryBackground;
  onPickPhoto: (source: PhotoSource) => void;
  onSelectGradient: (background: GradientBackground) => void;
};

const SWATCH_SIZE = 40;

export function BackgroundTray({ autoBackground, selected, onPickPhoto, onSelectGradient }: Props) {
  return (
    <Tray>
      <IconTile label={strings.editor.pickFromLibrary} onPress={() => onPickPhoto('library')}>
        <GalleryIcon />
      </IconTile>
      <IconTile label={strings.editor.takePhoto} onPress={() => onPickPhoto('camera')}>
        <CameraIcon />
      </IconTile>
      <View style={styles.divider} />
      {[autoBackground, ...GRADIENT_PRESETS].map((gradient) => (
        <GradientSwatch
          key={gradient.id}
          gradient={gradient}
          active={selected.kind === 'gradient' && selected.id === gradient.id}
          onPress={() => onSelectGradient(gradient)}
        />
      ))}
    </Tray>
  );
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

function GradientSwatch({
  gradient,
  active,
  onPress,
}: {
  gradient: GradientBackground;
  active: boolean;
  onPress: () => void;
}) {
  const isAuto = gradient.id === AUTO_BACKGROUND_ID;
  const gradientId = `swatch-${gradient.id}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isAuto ? strings.editor.autoColor : strings.editor.backgroundPreset(gradient.id)}
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
        <Rect
          width={SWATCH_SIZE}
          height={SWATCH_SIZE}
          rx={SWATCH_SIZE / 2}
          fill={`url(#${gradientId})`}
        />
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
      {isAuto && <Text style={styles.autoMark}>A</Text>}
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
  autoMark: {
    position: 'absolute',
    fontFamily: fonts.mono,
    fontSize: 11,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
});
