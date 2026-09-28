import { Image, Pressable, StyleSheet, Text } from 'react-native';
import { strings } from '@/i18n/es';
import type { AuthUser } from '@/services/auth/types';
import { brand, homeColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { TOP_BUTTON_SIZE } from './HelpButton';

type Props = {
  user: AuthUser | null;
  onPress: () => void;
};

export function userInitial(user: AuthUser | null): string {
  return (user?.name ?? user?.email ?? 'S').trim().charAt(0).toUpperCase() || 'S';
}

export function AccountButton({ user, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.home.openAccount}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {user?.avatarUrl ? (
        <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
      ) : (
        <Text style={styles.initial}>{userInitial(user)}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: TOP_BUTTON_SIZE,
    height: TOP_BUTTON_SIZE,
    borderRadius: TOP_BUTTON_SIZE / 2,
    backgroundColor: homeColors.card,
    borderWidth: 1.5,
    borderColor: homeColors.darkBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  avatar: { width: '100%', height: '100%' },
  initial: { fontFamily: fonts.sansExtraBold, fontSize: 20, color: brand[950] },
});
