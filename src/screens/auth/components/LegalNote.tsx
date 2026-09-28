import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, Text } from 'react-native';
import { LEGAL_URLS } from '@/constants/legal';
import { strings } from '@/i18n/es';
import { onboardingColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

export function LegalNote() {
  return (
    <Text style={styles.note}>
      {`${strings.auth.legalShort} `}
      <Text
        accessibilityRole="link"
        style={styles.link}
        onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}
      >
        {strings.auth.termsShort}
      </Text>
      {` ${strings.auth.legalAnd} `}
      <Text
        accessibilityRole="link"
        style={styles.link}
        onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}
      >
        {strings.auth.privacyShort}
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  note: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    color: onboardingColors.inkMuted,
    textAlign: 'center',
  },
  link: { fontFamily: fonts.sansSemiBold, color: onboardingColors.ink },
});
