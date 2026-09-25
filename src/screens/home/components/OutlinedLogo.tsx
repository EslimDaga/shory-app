import { StyleSheet, Text, View } from 'react-native';
import { homeColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

const BRAND_NAME = 'shory';

const OUTLINE_OFFSETS: [number, number][] = [
  [-2, 0],
  [2, 0],
  [0, -2],
  [0, 2],
  [-1.5, -1.5],
  [1.5, -1.5],
  [-1.5, 1.5],
  [1.5, 1.5],
  [0, 3],
];

export function OutlinedLogo() {
  return (
    <View accessibilityRole="header" accessibilityLabel={BRAND_NAME}>
      {OUTLINE_OFFSETS.map(([x, y]) => (
        <Text
          key={`${x}:${y}`}
          importantForAccessibility="no"
          style={[styles.logo, styles.outline, { transform: [{ translateX: x }, { translateY: y }] }]}
        >
          {BRAND_NAME}
        </Text>
      ))}
      <Text style={styles.logo}>{BRAND_NAME}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 40,
    lineHeight: 48,
    color: homeColors.ink,
    letterSpacing: -0.5,
  },
  outline: { position: 'absolute', color: '#FFFFFF' },
});
