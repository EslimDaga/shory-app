import { useEffect, useEffectEvent, useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '@/i18n/es';
import { editorColors, homeColors } from '@/theme/colors';

export type SheetTone = 'light' | 'dark';

type Props = {
  visible: boolean;
  onClose: () => void;
  // Once the sheet is fully gone (iOS finished dismissing it). Another modal can only be
  // presented after this: opening one mid-dismissal leaves an invisible modal blocking the app.
  onClosed?: () => void;
  tone?: SheetTone;
  children: ReactNode;
};

const FALLBACK_HEIGHT = 520;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 1.1;

const TONES = {
  light: { sheet: homeColors.card, handle: 'rgba(24, 31, 0, 0.16)', backdrop: 'rgba(12, 16, 0, 0.42)' },
  dark: { sheet: editorColors.surface, handle: 'rgba(255, 255, 255, 0.22)', backdrop: 'rgba(0, 0, 0, 0.6)' },
} as const;

export function BottomSheet({ visible, onClose, onClosed, tone = 'light', children }: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [height, setHeight] = useState(FALLBACK_HEIGHT);
  const [progress] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));
  const colors = TONES[tone];
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => setKeyboardHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (visible && !mounted) setMounted(true);

  // Not an effect dependency: a parent re-render with a new inline callback would restart the animation.
  const notifyClosed = useEffectEvent(() => onClosed?.());

  useEffect(() => {
    if (!mounted) return;
    const animation = visible
      ? Animated.spring(progress, {
          toValue: 1,
          damping: 22,
          stiffness: 220,
          mass: 0.9,
          useNativeDriver: true,
        })
      : Animated.timing(progress, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        });
    if (visible) drag.setValue(0);
    animation.start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
        // iOS and web report the end of the dismissal through the Modal's onDismiss; Android, now.
        if (Platform.OS === 'android') notifyClosed();
      }
    });
    return () => animation.stop();
  }, [visible, mounted, progress, drag]);

  const panResponder = useMemo(() => {
    const springBack = () =>
      Animated.spring(drag, { toValue: 0, damping: 20, stiffness: 260, useNativeDriver: true }).start();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_event, gesture) => drag.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
          onClose();
        } else {
          springBack();
        }
      },
      // A cancelled touch (call banner, system alert) isn't a deliberate swipe: settle back up.
      onPanResponderTerminate: springBack,
    });
  }, [drag, onClose]);

  const handleLayout = (event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height);

  // Built once per height: recreating native-driven nodes on every render (every keystroke in a
  // data sheet) detaches and reattaches the whole graph.
  const translateY = useMemo(
    () => Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }), drag),
    [progress, drag, height],
  );

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      onDismiss={onClosed}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.backdrop, opacity: progress }]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={strings.account.close}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        onLayout={handleLayout}
        style={[
          styles.sheet,
          {
            backgroundColor: colors.sheet,
            paddingBottom: keyboardHeight > 0 ? 12 : insets.bottom + 16,
            bottom: keyboardHeight,
            transform: [{ translateY }],
          },
        ]}
        // A modal sheet hides the backdrop's close button from VoiceOver, so the two-finger scrub
        // closes it. Not aria-modal: RN doesn't map that to a native View.
        accessibilityViewIsModal
        onAccessibilityEscape={onClose}
      >
        <View style={styles.grabZone} {...panResponder.panHandlers}>
          <View style={[styles.handle, { backgroundColor: colors.handle }]} />
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 0,
  },
  grabZone: { marginHorizontal: -22, paddingTop: 10, paddingBottom: 18, alignItems: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3 },
});
