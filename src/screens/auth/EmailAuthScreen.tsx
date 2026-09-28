import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MailIcon } from '@/components/Icons';
import { KineticText } from '@/components/motion/KineticText';
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';
import { PillButton } from '@/components/PillButton';
import { ShoryLogo } from '@/components/ShoryLogo';
import { TextField } from '@/components/TextField';
import { calmLayout, riseIn, zoomIn } from '@/components/motion/calmEntrance';
import { strings } from '@/i18n/es';
import { useAuth } from '@/providers/AuthProvider';
import { brand, onboardingColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { hapticSelection, hapticSuccess } from '@/utils/haptics';
import { isPasswordStrongEnough } from '@/utils/passwordStrength';
import type { AuthMode } from './AuthScreen';
import { BackButton } from './components/OnboardingHeader';
import { SoftBackdrop } from './components/SoftBackdrop';

type EmailView =
  { kind: 'form'; mode: AuthMode } | { kind: 'reset' } | { kind: 'sent'; reason: 'confirm' | 'reset' };

type Props = {
  mode: AuthMode;
  onBack: () => void;
};

type FieldErrors = { name?: string; email?: string; password?: string };

const CODE_PATTERN = /^\d{6,10}$/;
const RESEND_COOLDOWN_S = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const text = strings.auth.email;

function validate(mode: AuthMode | 'reset', name: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (mode === 'signup' && !name.trim()) errors.name = text.validation.name;
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = text.validation.email;
  // Signing in only needs a password; the strength rules apply when one is created, so accounts
  // made under an older rule can still get in.
  if (mode === 'login' && !password) errors.password = text.validation.password;
  // New accounts need a genuinely strong password; the meter under the field explains what's missing.
  if (mode === 'signup' && !isPasswordStrongEnough(password)) errors.password = text.strength.label;
  return errors;
}

export function EmailAuthScreen({ mode, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { signInWithEmail, signUpWithEmail, requestPasswordReset, pendingMethod, error, clearError } =
    useAuth();
  const [view, setView] = useState<EmailView>({ kind: 'form', mode });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => clearError, [clearError]);

  const busy = pendingMethod === 'email';

  const go = (next: EmailView) => {
    clearError();
    setErrors({});
    setView(next);
  };

  const submit = async () => {
    const currentMode = view.kind === 'form' ? view.mode : 'reset';
    const found = validate(currentMode, name, email, password);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    hapticSelection();
    const trimmedEmail = email.trim().toLowerCase();

    if (currentMode === 'login') {
      await signInWithEmail(trimmedEmail, password);
    } else if (currentMode === 'signup') {
      const result = await signUpWithEmail(name.trim(), trimmedEmail, password);
      if (result === 'confirmEmail') {
        hapticSuccess();
        go({ kind: 'sent', reason: 'confirm' });
      }
    } else if (await requestPasswordReset(trimmedEmail)) {
      hapticSuccess();
      go({ kind: 'sent', reason: 'reset' });
    }
  };

  const title =
    view.kind === 'sent'
      ? text.checkInboxTitle
      : view.kind === 'reset'
        ? text.resetTitle
        : view.mode === 'signup'
          ? text.signupTitle
          : text.loginTitle;

  const handleBack = () => {
    if (view.kind === 'form') onBack();
    else go({ kind: 'form', mode: 'login' });
  };

  return (
    <View style={styles.screen}>
      <SoftBackdrop />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <BackButton onPress={handleBack} />
          </View>

          <Animated.View entering={zoomIn(60)} style={styles.logo}>
            <ShoryLogo width={96} delay={320} />
          </Animated.View>

          <View key={title} style={styles.titleBlock}>
            <KineticText text={title} style={styles.title} delay={120} stagger={80} />
          </View>

          {view.kind === 'sent' ? (
            <Animated.View entering={riseIn(260)} style={styles.sent}>
              <Animated.View entering={zoomIn(360)} style={styles.sentIcon}>
                <MailIcon size={34} color={brand[950]} />
              </Animated.View>
              <Text style={styles.sentBody}>
                {view.reason === 'confirm'
                  ? text.checkInboxConfirm(email.trim())
                  : text.checkInboxReset(email.trim())}
              </Text>
              {view.reason === 'confirm' && (
                <ConfirmCodeForm email={email.trim().toLowerCase()} error={error} busy={busy} />
              )}
              <PillButton
                label={text.resetBack}
                variant="light"
                onPress={() => go({ kind: 'form', mode: 'login' })}
              />
            </Animated.View>
          ) : (
            <Animated.View layout={calmLayout} style={styles.form}>
              {view.kind === 'reset' && (
                <Animated.Text entering={FadeIn.duration(300)} style={styles.helper}>
                  {text.resetBody}
                </Animated.Text>
              )}
              {view.kind === 'form' && view.mode === 'signup' && (
                <Animated.View entering={riseIn()}>
                  <TextField
                    label={text.nameLabel}
                    placeholder={text.namePlaceholder}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    error={errors.name}
                  />
                </Animated.View>
              )}
              <Animated.View entering={riseIn(200)}>
                <TextField
                  ref={emailRef}
                  label={text.emailLabel}
                  placeholder={text.emailPlaceholder}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType={view.kind === 'reset' ? 'send' : 'next'}
                  onSubmitEditing={() => (view.kind === 'reset' ? submit() : passwordRef.current?.focus())}
                  error={errors.email}
                />
              </Animated.View>
              {view.kind === 'form' && (
                <Animated.View entering={riseIn(260)}>
                  <TextField
                    ref={passwordRef}
                    label={text.passwordLabel}
                    placeholder={text.passwordPlaceholder}
                    value={password}
                    onChangeText={setPassword}
                    secure
                    autoCapitalize="none"
                    autoComplete={view.mode === 'signup' ? 'new-password' : 'current-password'}
                    textContentType={view.mode === 'signup' ? 'newPassword' : 'password'}
                    returnKeyType="go"
                    onSubmitEditing={submit}
                    error={view.mode === 'login' ? errors.password : undefined}
                  />
                  {view.mode === 'signup' && (
                    <View style={styles.meter}>
                      <PasswordStrengthMeter password={password} invalid={Boolean(errors.password)} />
                    </View>
                  )}
                </Animated.View>
              )}
              {view.kind === 'form' && view.mode === 'login' && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => go({ kind: 'reset' })}
                  hitSlop={8}
                  style={styles.forgot}
                >
                  <Text style={styles.link}>{text.forgot}</Text>
                </Pressable>
              )}

              {error ? (
                <Animated.Text entering={FadeIn} style={styles.error} accessibilityLiveRegion="polite">
                  {error}
                </Animated.Text>
              ) : null}

              <Animated.View entering={riseIn(320)} style={styles.submit}>
                <PillButton
                  label={
                    view.kind === 'reset' ? text.resetSend : view.mode === 'signup' ? text.signup : text.login
                  }
                  loading={busy}
                  onPress={submit}
                />
              </Animated.View>

              {view.kind === 'form' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => go({ kind: 'form', mode: view.mode === 'login' ? 'signup' : 'login' })}
                  style={styles.switch}
                >
                  <Text style={styles.switchText}>
                    {view.mode === 'login' ? text.switchToSignup : text.switchToLogin}
                    <Text style={styles.link}>
                      {view.mode === 'login' ? text.switchToSignupAction : text.switchToLoginAction}
                    </Text>
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => go({ kind: 'form', mode: 'login' })}
                  style={styles.switch}
                >
                  <Text style={styles.link}>{text.resetBack}</Text>
                </Pressable>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function ConfirmCodeForm({ email, error, busy }: { email: string; error: string | null; busy: boolean }) {
  const { verifyEmailCode, resendConfirmation } = useAuth();
  const [code, setCode] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = async () => {
    const trimmed = code.trim();
    if (!CODE_PATTERN.test(trimmed)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    hapticSelection();
    if (await verifyEmailCode(email, trimmed)) hapticSuccess();
  };

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    hapticSelection();
    setResent(false);
    if (await resendConfirmation(email)) {
      setResent(true);
      setCooldown(RESEND_COOLDOWN_S);
    }
  };

  return (
    <View style={styles.form}>
      <TextField
        label={text.codeLabel}
        placeholder={text.codePlaceholder}
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={10}
        returnKeyType="go"
        onSubmitEditing={verify}
        error={invalid ? text.validation.code : undefined}
      />
      {error ? (
        <Animated.Text entering={FadeIn} style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Animated.Text>
      ) : resent ? (
        <Animated.Text entering={FadeIn} style={styles.notice} accessibilityLiveRegion="polite">
          {text.codeResent}
        </Animated.Text>
      ) : null}
      <PillButton label={text.codeVerify} loading={busy} onPress={verify} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: cooldown > 0 }}
        disabled={cooldown > 0 || busy}
        onPress={resend}
        style={styles.switch}
      >
        <Text style={cooldown > 0 ? styles.switchText : styles.link}>
          {cooldown > 0 ? text.codeResendIn(cooldown) : text.codeResend}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { marginTop: 10 },
  screen: { flex: 1, backgroundColor: '#F6F7F2' },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24 },
  header: { height: 56, justifyContent: 'center' },
  logo: { alignSelf: 'center', marginTop: 12 },
  titleBlock: { marginTop: 20, marginBottom: 24 },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -1.6,
    color: onboardingColors.ink,
  },
  form: { gap: 14 },
  helper: {
    fontFamily: fonts.sansMedium,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.3,
    color: onboardingColors.inkMuted,
    textAlign: 'center',
    marginBottom: 4,
  },
  forgot: { alignSelf: 'flex-end', marginRight: 6 },
  link: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: onboardingColors.ink,
    textDecorationLine: 'underline',
  },
  error: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    lineHeight: 21,
    color: onboardingColors.error,
    textAlign: 'center',
  },
  submit: { marginTop: 6 },
  switch: { alignSelf: 'center', paddingVertical: 8 },
  switchText: { fontFamily: fonts.sansMedium, fontSize: 16, color: onboardingColors.inkMuted },
  notice: { fontFamily: fonts.sansMedium, fontSize: 16, color: '#1E9E5A', textAlign: 'center' },
  sent: { alignItems: 'stretch', gap: 20 },
  sentIcon: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentBody: {
    fontFamily: fonts.sansMedium,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.3,
    color: onboardingColors.inkMuted,
    textAlign: 'center',
  },
});
