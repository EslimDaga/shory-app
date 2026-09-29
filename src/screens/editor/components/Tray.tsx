import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import { editorColors } from '@/theme/colors';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  // Pinned before the scrolling row, so it stays reachable however many items follow.
  leading?: ReactNode;
};

export function Tray({ children, scroll = true, leading }: Props) {
  const [progress] = useState(() => new Animated.Value(0));
  // Created once: a new interpolation each render would rewire the native-driven animation.
  const [translateY] = useState(() => progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <Animated.View style={[styles.tray, { opacity: progress, transform: [{ translateY }] }]}>
      {scroll ? (
        <View style={styles.row}>
          {leading && <View style={styles.leading}>{leading}</View>}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={[styles.content, leading ? styles.contentAfterLeading : null]}
          >
            {children}
          </ScrollView>
        </View>
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
  row: { flexDirection: 'row', alignItems: 'center' },
  leading: {
    paddingLeft: 14,
    paddingRight: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: editorColors.hairline,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, gap: 10, alignItems: 'center' },
  contentAfterLeading: { paddingLeft: 10 },
});
