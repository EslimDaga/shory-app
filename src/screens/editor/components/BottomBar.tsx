import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ShareIcon } from '@/components/Icons';
import { strings } from '@/i18n/es';
import { editorColors } from '@/theme/colors';
import type { StoryBackground } from '@/types/storyBackground';
import type { ExportAction } from '../hooks/useStoryExport';
import { Shutter } from './Shutter';

type Props = {
  background: StoryBackground;
  coverUrl: string;
  pendingAction: ExportAction | null;
  backgroundTrayOpen: boolean;
  onToggleBackgroundTray: () => void;
  onShare: () => void;
  onShareSheet: () => void;
};

export function BottomBar({
  background,
  coverUrl,
  pendingAction,
  backgroundTrayOpen,
  onToggleBackgroundTray,
  onShare,
  onShareSheet,
}: Props) {
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.editor.changeBackground}
        accessibilityState={{ expanded: backgroundTrayOpen }}
        onPress={onToggleBackgroundTray}
        style={({ pressed }) => [
          styles.backgroundThumb,
          backgroundTrayOpen && styles.backgroundThumbActive,
          pressed && styles.pressed,
        ]}
      >
        {background.kind === 'photo' ? (
          <Image source={{ uri: background.uri }} style={StyleSheet.absoluteFill} />
        ) : (
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="background-thumb" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={background.top} />
                <Stop offset="1" stopColor={background.bottom} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#background-thumb)" />
          </Svg>
        )}
      </Pressable>

      <Shutter coverUrl={coverUrl} spinning={pendingAction === 'instagram'} onPress={onShare} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.editor.share}
        onPress={onShareSheet}
        disabled={pendingAction !== null}
        style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
      >
        {pendingAction === 'share' ? (
          <ActivityIndicator color={editorColors.text} />
        ) : (
          <ShareIcon size={20} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  pressed: { opacity: 0.6 },
  backgroundThumb: {
    width: 44,
    height: 44,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: editorColors.text,
    backgroundColor: editorColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backgroundThumbActive: { borderColor: editorColors.accent },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: editorColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
