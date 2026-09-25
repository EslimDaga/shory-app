import { useCallback, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloseIcon } from '@/components/Icons';
import { createAutoBackground } from '@/constants/storyBackgrounds';
import { strings } from '@/i18n/es';
import { pickPhoto, type PhotoSource } from '@/services/media/photoLibrary';
import { editorColors } from '@/theme/colors';
import { STORY_ASPECT } from '@/theme/layout';
import type { TrackMetadata } from '@/types/music';
import type { StoryBackground } from '@/types/storyBackground';
import { getErrorMessage } from '@/utils/errors';
import { hapticSelection } from '@/utils/haptics';
import { WIDGETS } from '@/widgets/registry';
import type { WidgetDefinition, WidgetTone } from '@/widgets/types';
import { BackgroundTray } from './components/BackgroundTray';
import { BottomBar } from './components/BottomBar';
import { GlassButton } from './components/GlassButton';
import { StoryCanvas } from './components/StoryCanvas';
import { Toast, type ToastMessage } from './components/Toast';
import { ToneTray } from './components/ToneTray';
import { ToolRail } from './components/ToolRail';
import { WidgetTray } from './components/WidgetTray';
import { DEFAULT_TONE, type EditorTool } from './editorTools';
import { useStoryExport } from './hooks/useStoryExport';

type Props = {
  track: TrackMetadata;
  onClose: () => void;
  onExported?: (track: TrackMetadata) => void;
};

type CanvasSize = { width: number; height: number };

function fitStoryCanvas(width: number, height: number): CanvasSize {
  const byWidth = { width, height: width * STORY_ASPECT };
  return byWidth.height <= height ? byWidth : { width: height / STORY_ASPECT, height };
}

export function EditorScreen({ track, onClose, onExported }: Props) {
  const insets = useSafeAreaInsets();
  const [autoBackground] = useState(() => createAutoBackground(track.accentColor));
  const [activeTool, setActiveTool] = useState<EditorTool | null>(null);
  const [background, setBackground] = useState<StoryBackground>(autoBackground);
  const [widget, setWidget] = useState<WidgetDefinition>(WIDGETS[0]);
  const [tone, setTone] = useState<WidgetTone>(DEFAULT_TONE);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showMessage = useCallback((text: string, isError = false) => setToast({ text, isError }), []);
  const hideToast = useCallback(() => setToast(null), []);

  const { storyRef, pendingAction, shareToStories, saveStory } = useStoryExport({
    track,
    onExported,
    onMessage: showMessage,
  });

  const onStageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize(fitStoryCanvas(width, height));
  };

  const toggleTool = (tool: EditorTool) => {
    hapticSelection();
    setActiveTool((current) => (current === tool ? null : tool));
  };

  const choosePhoto = async (source: PhotoSource) => {
    hapticSelection();
    try {
      const uri = await pickPhoto(source);
      if (!uri) return;
      setBackground({ kind: 'photo', uri });
      setActiveTool(null);
    } catch (error) {
      showMessage(getErrorMessage(error, strings.errors.photoOpenFailed), true);
    }
  };

  const WidgetComponent = widget.Component;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 4, paddingBottom: insets.bottom }]}>
      <View style={styles.stage} onLayout={onStageLayout}>
        {canvasSize.width > 0 && (
          <View style={canvasSize}>
            <StoryCanvas
              width={canvasSize.width}
              height={canvasSize.height}
              background={background}
              storyRef={storyRef}
              resetKey={widget.id}
              onBackgroundPress={() => setActiveTool(null)}
            >
              <WidgetComponent track={track} tone={tone} />
            </StoryCanvas>

            <GlassButton label={strings.editor.close} onPress={onClose} style={styles.closeButton}>
              <CloseIcon size={20} />
            </GlassButton>

            <ToolRail activeTool={activeTool} onToggle={toggleTool} />

            {toast && <Toast {...toast} onHidden={hideToast} />}

            {activeTool === 'background' && (
              <BackgroundTray
                autoBackground={autoBackground}
                selected={background}
                onPickPhoto={choosePhoto}
                onSelectGradient={(gradient) => {
                  hapticSelection();
                  setBackground(gradient);
                }}
              />
            )}
            {activeTool === 'widget' && (
              <WidgetTray
                track={track}
                tone={tone}
                selectedId={widget.id}
                onSelect={(next) => {
                  hapticSelection();
                  setWidget(next);
                }}
              />
            )}
            {activeTool === 'style' && (
              <ToneTray
                accentColor={track.accentColor}
                selected={tone}
                onSelect={(next) => {
                  hapticSelection();
                  setTone(next);
                }}
              />
            )}
          </View>
        )}
      </View>

      <BottomBar
        background={background}
        coverUrl={track.coverUrl}
        pendingAction={pendingAction}
        backgroundTrayOpen={activeTool === 'background'}
        onToggleBackgroundTray={() => toggleTool('background')}
        onShare={() => {
          setActiveTool(null);
          shareToStories();
        }}
        onSave={() => {
          setActiveTool(null);
          saveStory();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: editorColors.background },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  closeButton: { position: 'absolute', top: 14, left: 14 },
});
