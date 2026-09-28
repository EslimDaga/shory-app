import { useEffect, useEffectEvent, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { pushEntering, pushExiting, type PushDirection } from '@/components/motion/pushTransition';
import { loadPreferredSource, savePreferredSource } from '@/services/storage/onboardingStorage';
import type { MusicSource } from '@/types/music';
import { AuthScreen, type AuthMode } from './AuthScreen';
import { EmailAuthScreen } from './EmailAuthScreen';
import { HowStepScreen } from './HowStepScreen';
import { SourceStepScreen } from './SourceStepScreen';
import { WelcomeScreen } from './WelcomeScreen';

type Step =
  | { name: 'welcome' }
  | { name: 'source' }
  | { name: 'how' }
  | { name: 'auth'; mode: AuthMode }
  | { name: 'email'; mode: AuthMode };

const STEP_COUNT = 3;

export function AuthFlow({ revealed }: { revealed: boolean }) {
  const [history, setHistory] = useState<Step[]>([{ name: 'welcome' }]);
  const [preferredSource, setPreferredSource] = useState<MusicSource | null>(null);
  const [direction, setDirection] = useState<PushDirection>(1);
  const step = history[history.length - 1];

  useEffect(() => {
    loadPreferredSource().then(setPreferredSource);
  }, []);

  const push = (next: Step) => {
    setDirection(1);
    setHistory((current) => [...current, next]);
  };
  const back = () => {
    setDirection(-1);
    setHistory((current) => (current.length > 1 ? current.slice(0, -1) : current));
  };

  const onHardwareBack = useEffectEvent(() => {
    if (history.length <= 1) return false;
    back();
    return true;
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => onHardwareBack());
    return () => subscription.remove();
  }, []);

  const selectSource = (source: MusicSource | null) => {
    setPreferredSource(source);
    if (source) savePreferredSource(source);
    push({ name: 'how' });
  };

  const key = step.name === 'auth' || step.name === 'email' ? `${step.name}:${step.mode}` : step.name;

  return (
    <View style={styles.stack}>
      <Animated.View
        key={key}
        style={styles.screen}
        entering={pushEntering(direction)}
        exiting={pushExiting(direction)}
      >
        {step.name === 'welcome' && (
          <WelcomeScreen
            revealed={revealed}
            onGetStarted={() => push({ name: 'source' })}
            onHaveAccount={() => push({ name: 'auth', mode: 'login' })}
          />
        )}
        {step.name === 'source' && (
          <SourceStepScreen
            progress={1 / STEP_COUNT}
            selected={preferredSource}
            onBack={back}
            onSelect={selectSource}
          />
        )}
        {step.name === 'how' && (
          <HowStepScreen
            progress={2 / STEP_COUNT}
            onBack={back}
            onContinue={() => push({ name: 'auth', mode: 'signup' })}
          />
        )}
        {step.name === 'auth' && (
          <AuthScreen
            mode={step.mode}
            onBack={back}
            onEmail={() => push({ name: 'email', mode: step.mode })}
          />
        )}
        {step.name === 'email' && <EmailAuthScreen mode={step.mode} onBack={back} />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flex: 1, backgroundColor: '#FFFFFF' },
  screen: { ...StyleSheet.absoluteFill },
});
