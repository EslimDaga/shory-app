import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { CheckIcon } from '@/components/Icons';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

export type ToastMessage = { text: string; isError?: boolean };

type Props = ToastMessage & { onHidden: () => void };

const SUCCESS_DURATION_MS = 1600;
const ERROR_DURATION_MS = 3200;

export function Toast({ text, isError, onHidden }: Props) {
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(isError ? ERROR_DURATION_MS : SUCCESS_DURATION_MS),
      Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => finished && onHidden());
    return () => animation.stop();
  }, [text, isError, opacity, onHidden]);

  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { opacity }]}>
      {!isError && <CheckIcon size={16} />}
      <Text style={[styles.text, isError && styles.errorText]}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    backgroundColor: editorColors.toastBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: editorColors.hairline,
  },
  text: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.6, color: editorColors.text },
  errorText: { color: editorColors.danger },
});
