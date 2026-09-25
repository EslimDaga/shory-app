import { Pressable, StyleSheet, Text } from 'react-native';
import { strings } from '@/i18n/es';
import { brand, homeColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export function HelpButton({ expanded, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={expanded ? strings.home.hideHelp : strings.home.howItWorks}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{expanded ? '×' : '?'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: homeColors.dark,
    borderWidth: 1.5,
    borderColor: homeColors.darkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  label: { fontFamily: fonts.sansExtraBold, fontSize: 24, color: brand[600], marginTop: -2 },
});
