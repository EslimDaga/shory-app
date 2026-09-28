import { useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScreenTransition } from '@/components/ScreenTransition';
import { AnimatedSplash } from '@/components/splash/AnimatedSplash';
import { useAppFonts } from '@/hooks/useAppFonts';
import { useHistory } from '@/hooks/useHistory';
import { useTrackLoader } from '@/hooks/useTrackLoader';
import { Paywall } from '@/components/Paywall';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { SubscriptionProvider } from '@/providers/SubscriptionProvider';
import { AuthFlow } from '@/screens/auth/AuthFlow';
import { NewPasswordScreen } from '@/screens/auth/NewPasswordScreen';
import { EditorScreen } from '@/screens/editor/EditorScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { editorColors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync();

export default function App() {
  return (
    <SafeAreaProvider style={styles.root}>
      <AuthProvider>
        <SubscriptionProvider>
          <AppContent />
          <Paywall />
        </SubscriptionProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const fontsLoaded = useAppFonts();
  const { status, recovering, user } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const signedIn = status === 'signedIn';
  const { history, addExport } = useHistory(signedIn ? (user?.id ?? null) : null);
  const { state, error, loadFromClipboard, openTrack, close } = useTrackLoader();

  const ready = fontsLoaded && status !== 'restoring';
  const isEditing = signedIn && state.status === 'ready';

  return (
    <>
      <StatusBar style={isEditing && splashDone ? 'light' : 'dark'} />
      {!ready ? null : !signedIn ? (
        <AuthFlow revealed={revealed} />
      ) : recovering ? (
        <NewPasswordScreen />
      ) : isEditing ? (
        <ScreenTransition key={`editor:${state.track.url}`} variant="zoom">
          <EditorScreen track={state.track} onClose={close} onExported={addExport} />
        </ScreenTransition>
      ) : (
        <ScreenTransition key="home" variant="rise">
          <HomeScreen
            loading={state.status === 'loading'}
            error={error}
            history={history}
            onPasteLink={loadFromClipboard}
            onOpenRecent={openTrack}
          />
        </ScreenTransition>
      )}
      {splashDone ? null : (
        <AnimatedSplash
          ready={ready}
          onExitStart={() => setRevealed(true)}
          onFinish={() => setSplashDone(true)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: editorColors.background },
});
