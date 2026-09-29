import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { strings } from '@/i18n/es';
import { brand } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { withAlpha } from '@/utils/color';

type Props = {
  loading: boolean;
  onPress: () => void;
};

export function PasteLinkButton({ loading, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-label={loading ? strings.home.readingLink : strings.home.pasteLinkLabel}
      aria-busy={loading}
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
    // iOS draws blurRadius / 2 as the layer's shadowRadius, so 32 keeps the previous 16.
    boxShadow: [{ offsetX: 0, offsetY: 8, blurRadius: 32, color: withAlpha(brand[950], 0.3) }],
  },
  pressed: { transform: [{ scale: 0.98 }] },
  content: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  plus: { fontFamily: fonts.sansExtraBold, fontSize: 30, color: brand[600], marginTop: -3 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 24, color: brand[600] },
});
