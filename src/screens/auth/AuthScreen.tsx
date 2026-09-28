import { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppleLogo, GoogleLogo } from '@/components/BrandIcons';
import { MailIcon } from '@/components/Icons';
import { KineticText } from '@/components/motion/KineticText';
import { PillButton } from '@/components/PillButton';
import { ShoryLogo } from '@/components/ShoryLogo';
import { riseIn, zoomIn } from '@/components/motion/calmEntrance';
import { strings } from '@/i18n/es';
import { useAuth } from '@/providers/AuthProvider';
import { isAppleAuthAvailable } from '@/services/auth/appleAuth';
import { isAppleSignInEnabled, isPreviewAuth } from '@/services/auth/authConfig';
import type { AuthProviderId } from '@/services/auth/types';
import { onboardingColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { hapticSelection } from '@/utils/haptics';
import { AuthShowcase } from './components/AuthShowcase';
import { LegalNote } from './components/LegalNote';
import { BackButton } from './components/OnboardingHeader';
import { SoftBackdrop } from './components/SoftBackdrop';

export type AuthMode = 'signup' | 'login';

type Props = {
  mode: AuthMode;
  onBack: () => void;
  onEmail: () => void;
};

const LOGO_WIDTH = 132;
// Below this height the live player would squeeze the buttons, so only the services row shows.
const SHOWCASE_MIN_HEIGHT = 760;

export function AuthScreen({ mode, onBack, onEmail }: Props) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const { signIn, pendingMethod, error, clearError } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleAuthAvailable().then(setAppleAvailable);
  }, []);

  useEffect(() => clearError, [clearError]);

  const handleSignIn = (provider: AuthProviderId) => {
    hapticSelection();
    signIn(provider);
  };

  const busy = pendingMethod !== null;
  const showApple = isAppleSignInEnabled && (appleAvailable || isPreviewAuth);

  return (
    <View style={styles.screen}>
      <SoftBackdrop />
      <View style={[styles.content, { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.header}>
          <BackButton onPress={onBack} />
          {isPreviewAuth && (
            <View style={styles.previewBadge}>
              <Text style={styles.previewText}>{strings.auth.previewBadge}</Text>
            </View>
          )}
        </View>

        <View style={styles.hero}>
          <Animated.View entering={zoomIn(80)} style={styles.logo}>
            <ShoryLogo width={LOGO_WIDTH} delay={420} />
          </Animated.View>
          <KineticText
            text={mode === 'signup' ? strings.auth.signupTitle : strings.auth.loginTitle}
            style={styles.title}
            delay={220}
            stagger={90}
          />
          <Animated.Text entering={FadeIn.delay(540).duration(500)} style={styles.subtitle}>
            {strings.auth.subtitle}
          </Animated.Text>
        </View>

        <View style={styles.showcase}>
          <AuthShowcase
            width={window.width - 48}
            compact={window.height < SHOWCASE_MIN_HEIGHT || (showApple && window.height < 820)}
            delay={420}
          />
        </View>

        <View style={styles.buttons}>
          {showApple && (
            <Animated.View entering={riseIn(600)}>
              <PillButton
                label={strings.auth.continueWithApple}
                icon={<AppleLogo size={20} />}
                iconPlacement="leading"
                loading={pendingMethod === 'apple'}
                disabled={busy}
                onPress={() => handleSignIn('apple')}
              />
            </Animated.View>
          )}
          <Animated.View entering={riseIn(660)}>
            <PillButton
              label={strings.auth.continueWithGoogle}
              variant="light"
              icon={<GoogleLogo size={20} />}
              iconPlacement="leading"
              loading={pendingMethod === 'google'}
              disabled={busy}
              onPress={() => handleSignIn('google')}
            />
          </Animated.View>
          <Animated.View entering={riseIn(720)}>
            <PillButton
              label={strings.auth.continueWithEmail}
              variant="light"
              icon={<MailIcon size={20} color={onboardingColors.ink} />}
              iconPlacement="leading"
              disabled={busy}
              onPress={() => {
                hapticSelection();
                onEmail();
              }}
            />
          </Animated.View>
          {error ? (
            <Animated.Text entering={FadeIn} style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Animated.Text>
          ) : null}
          <Animated.View entering={FadeIn.delay(860).duration(500)} style={styles.legal}>
            <LegalNote />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7F2' },
  content: { flex: 1, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56 },
  previewBadge: {
    backgroundColor: 'rgba(10, 10, 9, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  previewText: { fontFamily: fonts.mono, fontSize: 11, color: onboardingColors.inkMuted },
  hero: { paddingTop: 8 },
  showcase: { flex: 1, justifyContent: 'center', paddingVertical: 16 },
  logo: { alignSelf: 'center', marginBottom: 22 },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -2,
    color: onboardingColors.ink,
  },
  subtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.3,
    color: onboardingColors.inkMuted,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
  },
  buttons: { gap: 12 },
  error: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    lineHeight: 21,
    color: onboardingColors.error,
    textAlign: 'center',
    marginTop: 4,
  },
  legal: { marginTop: 8 },
});
