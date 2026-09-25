import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScreenTransition } from '@/components/ScreenTransition';
import { useAppFonts } from '@/hooks/useAppFonts';
import { useHistory } from '@/hooks/useHistory';
import { useTrackLoader } from '@/hooks/useTrackLoader';
import { EditorScreen } from '@/screens/editor/EditorScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { editorColors } from '@/theme/colors';

export default function App() {
  const fontsLoaded = useAppFonts();
  const { history, addExport } = useHistory();
  const { state, error, loadFromClipboard, openTrack, close } = useTrackLoader();

  if (!fontsLoaded) return <View style={styles.splash} />;

  const isEditing = state.status === 'ready';

  return (
    <SafeAreaProvider style={styles.root}>
      <StatusBar style={isEditing ? 'light' : 'dark'} />
      {isEditing ? (
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: editorColors.background },
  root: { backgroundColor: editorColors.background },
});
