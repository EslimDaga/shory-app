import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KineticText } from '@/components/motion/KineticText';
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';
import { PillButton } from '@/components/PillButton';
import { ShoryLogo } from '@/components/ShoryLogo';
import { TextField } from '@/components/TextField';
import { riseIn, zoomIn } from '@/components/motion/calmEntrance';
import { strings } from '@/i18n/es';
import { useAuth } from '@/providers/AuthProvider';
import { onboardingColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { hapticSuccess } from '@/utils/haptics';
import { isPasswordStrongEnough } from '@/utils/passwordStrength';
import { SoftBackdrop } from './components/SoftBackdrop';
import { useAnnounce } from './hooks/useAnnounce';

const text = strings.auth.email;

export function NewPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { setNewPassword, pendingMethod, error } = useAuth();
  const [password, setPassword] = useState('');
  const [invalid, setInvalid] = useState(false);
  useAnnounce(error);

  const save = async () => {
    if (!isPasswordStrongEnough(password)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (await setNewPassword(password)) hapticSuccess();
  };

  return (
    <View style={styles.screen}>
      <SoftBackdrop />
      <KeyboardAvoidingView
        style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View entering={zoomIn()} style={styles.logo}>
          <ShoryLogo width={96} delay={300} />
        </Animated.View>
        <KineticText text={text.newPasswordTitle} style={styles.title} delay={120} stagger={80} />
        <Animated.Text entering={FadeIn.delay(360)} style={styles.body}>
          {text.newPasswordBody}
        </Animated.Text>
        <Animated.View entering={riseIn(420)} style={styles.form}>
          <TextField
            label={text.passwordLabel}
            placeholder={text.passwordPlaceholder}
            value={password}
            onChangeText={setPassword}
            secure
            autoFocus
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <PasswordStrengthMeter password={password} invalid={invalid} />
          {error ? (
            <Text style={styles.error} aria-live="polite">
              {error}
            </Text>
          ) : null}
          <PillButton label={text.newPasswordSave} loading={pendingMethod === 'email'} onPress={save} />
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7F2' },
  content: { flex: 1, paddingHorizontal: 24 },
  logo: { alignSelf: 'center', marginBottom: 20 },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -1.6,
    color: onboardingColors.ink,
  },
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.3,
    color: onboardingColors.inkMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  form: { gap: 14, marginTop: 28 },
  error: { fontFamily: fonts.sansMedium, fontSize: 16, color: onboardingColors.error, textAlign: 'center' },
});
