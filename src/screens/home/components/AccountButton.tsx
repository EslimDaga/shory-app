import { useState } from 'react';
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
  // By code point, so a name that starts with an emoji keeps the whole glyph.
  return Array.from((user?.name ?? user?.email ?? 'S').trim())[0]?.toUpperCase() || 'S';
}

export function AccountButton({ user, onPress }: Props) {
  // Keyed by URL rather than a flag, so switching accounts shows the new user's avatar again.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const avatarUrl = user?.avatarUrl && user.avatarUrl !== failedUrl ? user.avatarUrl : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.home.openAccount}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} onError={() => setFailedUrl(avatarUrl)} />
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
