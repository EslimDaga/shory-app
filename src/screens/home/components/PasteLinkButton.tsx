import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { strings } from '@/i18n/es';
import { brand } from '@/theme/colors';
import { fonts } from '@/theme/typography';

type Props = {
  loading: boolean;
  onPress: () => void;
};

export function PasteLinkButton({ loading, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.home.pasteLinkLabel}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={styles.content}>
        {loading ? (
          <>
            <ActivityIndicator color={brand[600]} />
            <Text style={styles.label}>{strings.home.readingLink}</Text>
          </>
        ) : (
          <>
            <Text style={styles.plus}>+</Text>
            <Text style={styles.label}>{strings.home.pasteLink}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 68,
    borderRadius: 34,
    backgroundColor: brand[950],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: brand[950],
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  pressed: { transform: [{ scale: 0.98 }] },
  content: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  plus: { fontFamily: fonts.sansExtraBold, fontSize: 30, color: brand[600], marginTop: -3 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 24, color: brand[600] },
});
