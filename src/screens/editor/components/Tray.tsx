import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, ScrollView, StyleSheet } from 'react-native';
import { editorColors } from '@/theme/colors';

type Props = {
  children: ReactNode;
  scroll?: boolean;
};

export function Tray({ children, scroll = true }: Props) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      style={[
        styles.tray,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        },
      ]}
    >
      {scroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tray: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 12,
    backgroundColor: editorColors.trayBackground,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  content: { paddingHorizontal: 14, gap: 10, alignItems: 'center' },
});
