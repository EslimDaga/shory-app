import { useEffect, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import { ArrowUpRightIcon } from '@/components/Icons';
import { strings } from '@/i18n/es';
import { editorColors } from '@/theme/colors';

type Props = {
  coverUrl: string;
  // The disc spins while a share runs.
  spinning: boolean;
  disabled: boolean;
  onPress: () => void;
};

export function Shutter({ coverUrl, spinning, disabled, onPress }: Props) {
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!spinning) return;
    rotation.setValue(0);
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spinning, rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.editor.shareToStories}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.ring, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.disc, { transform: [{ rotate }] }]}>
        <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} />
        <View style={styles.hole} />
      </Animated.View>
      <View style={styles.badge}>
        <ArrowUpRightIcon size={12} color={editorColors.onAccent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3.5,
    borderColor: editorColors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.94 }] },
  disc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hole: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: editorColors.background,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  badge: {
    position: 'absolute',
    right: -3,
    top: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: editorColors.accent,
    borderWidth: 2,
    borderColor: editorColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
