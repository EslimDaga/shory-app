import { Pressable, StyleSheet } from 'react-native';
import { QuestionIcon } from '@/components/Icons';
import { strings } from '@/i18n/es';
import { brand, homeColors } from '@/theme/colors';

type Props = {
  onPress: () => void;
};

export function HelpButton({ onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.home.openHelp}
      accessibilityHint={strings.help.subtitle}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <QuestionIcon size={26} color={brand[600]} />
    </Pressable>
  );
}

export const TOP_BUTTON_SIZE = 50;

const styles = StyleSheet.create({
  button: {
    width: TOP_BUTTON_SIZE,
    height: TOP_BUTTON_SIZE,
    borderRadius: TOP_BUTTON_SIZE / 2,
    backgroundColor: homeColors.dark,
    borderWidth: 1.5,
    borderColor: homeColors.darkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
});
