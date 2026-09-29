import * as Sentry from '@sentry/react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { strings } from '@/i18n/es';
import { editorColors } from '@/theme/colors';
import { PillButton } from './PillButton';

// A render error anywhere below would otherwise leave a blank screen: this reports it to Sentry and
// offers a way back. System fonts on purpose: the crash may happen before the app's fonts load.
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => (
        <View style={styles.root} accessibilityRole="alert">
          <Text style={styles.title}>{strings.crash.title}</Text>
          <Text style={styles.body}>{strings.crash.body}</Text>
          <View style={styles.action}>
            <PillButton label={strings.crash.retry} variant="lime" onPress={resetError} />
          </View>
        </View>
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: editorColors.background,
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: editorColors.text },
  body: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    color: editorColors.textMuted,
    marginTop: 10,
  },
  action: { marginTop: 28, alignSelf: 'stretch' },
});
