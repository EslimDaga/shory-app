import { StyleSheet, Text, View } from 'react-native';
import { strings } from '@/i18n/es';
import { brand, homeColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

export function HowItWorks() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{strings.home.howItWorks}</Text>
      {strings.home.steps.map((step, index) => (
        <View key={step} style={styles.step}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{index + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4, paddingBottom: 8 },
  title: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    color: homeColors.ink,
    marginBottom: 6,
    marginLeft: 2,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.sansExtraBold, fontSize: 15, color: brand[950] },
  stepText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 16, color: homeColors.ink },
});
