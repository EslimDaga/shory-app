import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { PillButton } from '@/components/PillButton';
import { strings } from '@/i18n/es';
import { brand, homeColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { HowItWorks } from './HowItWorks';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function HelpSheet({ visible, onClose }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title} accessibilityRole="header">
        {strings.help.title}
      </Text>
      <Text style={styles.subtitle}>{strings.help.subtitle}</Text>

      <View style={styles.section}>
        <HowItWorks showTitle={false} />
      </View>

      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>{strings.help.tipsTitle}</Text>
        {strings.help.tips.map((tip) => (
          <View key={tip} style={styles.tip}>
            <View style={styles.dot} />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>

      <PillButton label={strings.help.done} onPress={onClose} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.sansExtraBold, fontSize: 28, letterSpacing: -0.6, color: homeColors.ink },
  subtitle: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 21, color: homeColors.inkMuted, marginTop: 4 },
  section: { marginTop: 18 },
  tips: {
    backgroundColor: brand[100],
    borderRadius: 22,
    padding: 16,
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  tipsTitle: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: homeColors.ink },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: brand[800], marginTop: 8 },
  tipText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 14.5, lineHeight: 20, color: homeColors.ink },
});
