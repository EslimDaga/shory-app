import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloseIcon } from '@/components/Icons';
import {
  createAutoBackground,
  createCustomBackground,
  createRandomBackground,
} from '@/constants/storyBackgrounds';
import { strings } from '@/i18n/es';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { pickPhoto, pickVideo, type PhotoSource } from '@/services/media/photoLibrary';
import { deleteFile } from '@/services/media/tempFiles';
import { editorColors } from '@/theme/colors';
import { STORY_ASPECT } from '@/theme/layout';
import { DEFAULT_TEMPLATE_DEVICE } from '@/templates/registry';
import { describeVideo, videoRecordingSupported } from 'shory-recorder';
import type { TemplateContent, TemplateDefinition } from '@/templates/types';
import type { TrackMetadata } from '@/types/music';
import { stillBackground, type GradientBackground, type StoryBackground } from '@/types/storyBackground';
import { getErrorMessage } from '@/utils/errors';
import { hapticSelection } from '@/utils/haptics';
import { defaultConfigFor, WIDGETS } from '@/widgets/registry';
import { configToProps, type WidgetConfig, type WidgetData, type WidgetDefinition } from '@/widgets/types';
import { CREST_KEYS, TEAM_ID_KEYS } from '@/widgets/MatchWidget';
import { COUNTRY_KEY } from '@/widgets/WeatherCardWidget';
import { HOURLY_KEY } from '@/widgets/WeatherWidget';
import { BackgroundTray } from './components/BackgroundTray';
import { BottomBar } from './components/BottomBar';
import { StoryClockProvider, type StoryClockHandle } from '@/components/motion/StoryClock';
import { VIDEO_FPS } from '@/services/media/videoExport';
import { TEMPLATE_SECONDS } from '@/templates/templateClock';
import { ColorPickerSheet } from './components/ColorPickerSheet';
import { CustomizePanel } from './components/CustomizePanel';
import { FormatToggle } from './components/FormatToggle';
import { ExportProgressView } from './components/ExportProgressView';
import { GlassButton } from './components/GlassButton';
import { ShareSheet } from './components/ShareSheet';
import { StoryCanvas, type StoryCanvasHandle } from './components/StoryCanvas';
import { Toast, type ToastMessage } from './components/Toast';
import { ToolRail } from './components/ToolRail';
import { TemplateDataSheet } from './components/TemplateDataSheet';
import { TemplateTray } from './components/TemplateTray';
import { WidgetDataSheet } from './components/WidgetDataSheet';
import { WidgetLibrarySheet } from './components/WidgetLibrarySheet';
import { WidgetTray } from './components/WidgetTray';
import type { EditorTool } from './editorTools';
import { useImagePalette } from '@/hooks/useImagePalette';
import { STORY_VIDEO_SECONDS, useStoryExport, type ExportFormat } from './hooks/useStoryExport';

type Props = {
  track: TrackMetadata;
  onClose: () => void;
  onExported?: (track: TrackMetadata) => void;
};

type CanvasSize = { width: number; height: number };

const MAGIC_PER_IMAGE = 5;
// A background clip's export length is clamped to this range (seconds).
const MIN_CLIP_SECONDS = 3;
const MAX_CLIP_SECONDS = 15;

function fitStoryCanvas(width: number, height: number): CanvasSize {
  const byWidth = { width, height: width * STORY_ASPECT };
  return byWidth.height <= height ? byWidth : { width: height / STORY_ASPECT, height };
}

export function EditorScreen({ track, onClose, onExported }: Props) {
  const insets = useSafeAreaInsets();
  const [autoBackground] = useState(() => createAutoBackground(track.accentColor));
  const [activeTool, setActiveTool] = useState<EditorTool | null>(null);
  const [background, setBackground] = useState<StoryBackground>(autoBackground);
  const [customBackground, setCustomBackground] = useState<GradientBackground | null>(null);
  // The last photo picked, kept after switching to a color so its Magic colors stay on offer.
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [widget, setWidget] = useState<WidgetDefinition>(WIDGETS[0]);
  // Each widget keeps its own settings, so switching widgets and back never loses a tweak.
  const [configs, setConfigs] = useState<Record<string, WidgetConfig>>({});
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dataSheetOpen, setDataSheetOpen] = useState(false);
  const [template, setTemplate] = useState<TemplateDefinition | null>(null);
  // Each template keeps its own edits (cover, song, device…), like each widget keeps its config.
  const [templateEdits, setTemplateEdits] = useState<Record<string, Partial<TemplateContent>>>({});
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('photo');
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [toast, setToast] = useState<(ToastMessage & { id: number }) | null>(null);
  // A new id per message: the same text twice in a row still shows again, for its full time.
  const toastId = useRef(0);

  const showMessage = useCallback(
    (text: string, isError = false) => setToast({ text, isError, id: ++toastId.current }),
    [],
  );
  const hideToast = useCallback(() => setToast(null), []);

  const { user } = useAuth();
  const { isPro, requirePro, openPaywall } = useSubscription();
  const paywallAfterLibrary = useRef(false);
  const canvasRef = useRef<StoryCanvasHandle>(null);
  const clockRef = useRef<StoryClockHandle>(null);
  // Video posters this screen wrote to the temporary directory, deleted once nothing shows them.
  const posters = useRef(new Set<string>());
  const configFor = (target: WidgetDefinition) => configs[target.id] ?? defaultConfigFor(target);
  const config = configFor(widget);
  const userName = user?.name ?? user?.email?.split('@')[0] ?? strings.editor.safeArea.defaultName;
  // Starts from the shared song and the signed-in user; anything edited in its sheet wins.
  const contentFor = (target: TemplateDefinition): TemplateContent => ({
    title: track.title,
    artist: track.artist ?? '',
    coverUri: track.coverUrl,
    owner: userName,
    device: DEFAULT_TEMPLATE_DEVICE,
    ...templateEdits[target.id],
  });
  const templateContent = template ? contentFor(template) : null;
  const backgroundVideo = background.kind === 'video' ? background.uri : null;
  // How long the video export (and the preview loop) runs: a background clip sets the length, up
  // to what reads well in a story; otherwise the template's or the widget's standard length. The
  // clip's exact length, not rounded up: a longer story would restart the clip for its last frames.
  const storySeconds =
    background.kind === 'video'
      ? Math.min(MAX_CLIP_SECONDS, Math.max(MIN_CLIP_SECONDS, background.durationSeconds))
      : template
        ? TEMPLATE_SECONDS
        : STORY_VIDEO_SECONDS;
  // A video shows its first frame wherever a still picture of the background is needed.
  const still = stillBackground(background, autoBackground);

  const {
    storyRef,
    backgroundRef,
    stickerRef,
    pendingAction,
    videoExport,
    recording,
    shareToStories,
    shareWithMusic,
    saveStory,
    shareVideo,
    saveVideo,
    cancelVideo,
  } = useStoryExport({
    track,
    canvasRef,
    setClock: (seconds) => clockRef.current?.setTime(seconds),
    templateActive: template !== null,
    watermark: !isPro,
    backgroundVideo,
    durationSeconds: storySeconds,
    videoKey: () =>
      JSON.stringify({
        track,
        background,
        widget: template ? null : widget.id,
        config: template ? null : config,
        transform: template ? null : canvasRef.current?.currentTransform(),
        template: template?.id ?? null,
        templateContent,
      }),
    onExported,
    onMessage: showMessage,
  });

  const posterInUse = background.kind === 'video' ? background.posterUri : null;
  useEffect(() => {
    for (const uri of posters.current) {
      if (uri === posterInUse || uri === lastPhoto) continue;
      deleteFile(uri);
      posters.current.delete(uri);
    }
  }, [posterInUse, lastPhoto]);

  useEffect(() => {
    const written = posters.current;
    return () => {
      for (const uri of written) deleteFile(uri);
      written.clear();
    };
  }, []);

  // Android's back button steps back like the on-screen controls: out of an export, then out of
  // an open tray, then out of the editor. Open sheets are modals and handle it themselves.
  const onHardwareBack = useEffectEvent(() => {
    if (videoExport) cancelVideo();
    else if (activeTool) setActiveTool(null);
    else onClose();
    return true;
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => onHardwareBack());
    return () => subscription.remove();
  }, []);

  const onStageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize(fitStoryCanvas(width, height));
  };

  const toggleTool = (tool: EditorTool) => {
    hapticSelection();
    // With a template on the story, Customize means editing that template: its own sheet holds
    // every setting it has, so there's no second place to look.
    if (tool === 'customize' && template) {
      setActiveTool(null);
      setTemplateSheetOpen(true);
      return;
    }
    setActiveTool((current) => (current === tool ? null : tool));
  };

  const changeBackground = (next: StoryBackground) => setBackground(next);

  const choosePhoto = async (source: PhotoSource) => {
    hapticSelection();
    try {
      const uri = await pickPhoto(source);
      if (!uri) return;
      changeBackground({ kind: 'photo', uri });
      setLastPhoto(uri);
      setActiveTool(null);
    } catch (error) {
      showMessage(getErrorMessage(error, strings.errors.photoOpenFailed), true);
    }
  };

  // A clip becomes the story's background and plays behind the widget; the export is a video.
  const chooseVideo = async () => {
    hapticSelection();
    if (!requirePro('video')) return;
    try {
      const uri = await pickVideo();
      if (!uri) return;
      const { posterUri, durationSeconds } = await describeVideo(uri).catch(() => ({
        posterUri: null,
        durationSeconds: STORY_VIDEO_SECONDS,
      }));
      if (posterUri) posters.current.add(posterUri);
      changeBackground({ kind: 'video', uri, posterUri, durationSeconds });
      if (posterUri) setLastPhoto(posterUri);
      setFormat('video');
      setActiveTool(null);
    } catch (error) {
      showMessage(getErrorMessage(error, strings.errors.videoOpenFailed), true);
    }
  };

  const applyCustomBackground = (next: GradientBackground) => {
    setCustomBackground(next);
    changeBackground(next);
  };

  // `haptic`: false for continuous changes (a slider drag), which would otherwise buzz on every move.
  const updateConfig = (patch: Partial<WidgetConfig>, haptic = true) => {
    if (haptic) hapticSelection();
    setConfigs((current) => ({ ...current, [widget.id]: { ...configFor(widget), ...patch } }));
  };

  const fillContent = (patch: WidgetData) => {
    setConfigs((current) => {
      const base = current[widget.id] ?? defaultConfigFor(widget);
      return { ...current, [widget.id]: { ...base, content: { ...base.content, ...patch } } };
    });
  };

  // Typing a value by hand makes what was fetched alongside it stale: a new city, temperature or
  // sky drops the fetched hourly forecast, and a new team name drops that team's crest and id.
  const updateContent = (key: string, value: string) => {
    const patch: WidgetData = { [key]: value };
    if (widget.live === 'weather' && key !== HOURLY_KEY) patch[HOURLY_KEY] = '';
    if (widget.live === 'weather' && key === 'city') patch[COUNTRY_KEY] = '';
    if (widget.live === 'football' && (key === 'home' || key === 'away')) {
      patch[CREST_KEYS[key]] = '';
      patch[TEAM_ID_KEYS[key]] = '';
    }
    fillContent(patch);
  };

  const selectWidget = (next: WidgetDefinition) => {
    hapticSelection();
    if (next.pro && !requirePro('widget')) return;
    setWidget(next);
    setTemplate(null);
  };

  // Templates are made to move, so picking one switches the export to video (a Pro feature: on
  // the free plan, or where video can't be recorded, a template exports as a photo).
  const selectTemplate = (next: TemplateDefinition | null) => {
    hapticSelection();
    if (next?.pro && !requirePro('template')) return;
    setTemplate(next);
    if (next && isPro && videoRecordingSupported) setFormat('video');
  };

  const TemplateComponent = template?.Component;
  const trackFor = (content: TemplateContent): TrackMetadata => ({
    ...track,
    title: content.title,
    artist: content.artist,
    coverUrl: content.coverUri,
  });

  const editTemplate = (patch: Partial<TemplateContent>) => {
    if (!template) return;
    setTemplateEdits((current) => ({ ...current, [template.id]: { ...current[template.id], ...patch } }));
  };

  const pickTemplateCover = async () => {
    try {
      const uri = await pickPhoto('library');
      if (uri) editTemplate({ coverUri: uri });
    } catch (error) {
      showMessage(getErrorMessage(error, strings.errors.photoOpenFailed), true);
    }
  };

  // A background clip only exists as video, so a photo export isn't offered with one.
  const exportFormat: ExportFormat = backgroundVideo ? 'video' : format;

  // Photo: the story stands still, exactly as the image is captured. Video: it loops through the
  // same frames the recorder will draw, so the preview is the export.
  const previewLoopSeconds = exportFormat === 'video' ? storySeconds : null;

  // Magic colors: the photo's first (it's what the user just chose), then the cover the story shows.
  const photoPalette = useImagePalette(lastPhoto);
  const coverPalette = useImagePalette(templateContent?.coverUri ?? track.coverUrl);
  const magicColors = [
    ...new Set([...photoPalette.slice(0, MAGIC_PER_IMAGE), ...coverPalette.slice(0, MAGIC_PER_IMAGE)]),
  ];

  // A Pro pick can outlive Pro (the subscription lapsed mid-edit): the export asks again.
  const ensureProForExport = () => {
    if (exportFormat === 'video') return requirePro('video');
    if (template?.pro) return requirePro('template');
    if (!template && widget.pro) return requirePro('widget');
    return true;
  };

  const pickerInitialColor =
    background.kind === 'gradient' ? background.top : (customBackground?.top ?? autoBackground.top);

  const WidgetComponent = widget.Component;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 4, paddingBottom: insets.bottom }]}>
      <View style={styles.stage} onLayout={onStageLayout}>
        {canvasSize.width > 0 && (
          <View style={canvasSize}>
            <StoryClockProvider ref={clockRef} loopSeconds={previewLoopSeconds} fps={VIDEO_FPS}>
              <StoryCanvas
                width={canvasSize.width}
                height={canvasSize.height}
                background={background}
                storyRef={storyRef}
                backgroundRef={backgroundRef}
                stickerRef={stickerRef}
                ref={canvasRef}
                resetKey={widget.id}
                stickerSize={{ width: widget.width, height: widget.height }}
                onDragChange={setDragging}
                profile={{ name: userName, avatarUrl: user?.avatarUrl ?? null }}
                template={
                  TemplateComponent &&
                  templateContent && (
                    <TemplateComponent
                      track={trackFor(templateContent)}
                      background={background}
                      width={canvasSize.width}
                      height={canvasSize.height}
                      userName={templateContent.owner}
                      device={templateContent.device}
                    />
                  )
                }
                onBackgroundPress={() => setActiveTool(null)}
                recording={recording}
                watermark={!isPro}
              >
                <WidgetComponent track={track} {...configToProps(config)} />
              </StoryCanvas>
            </StoryClockProvider>

            {!dragging && (
              <>
                <GlassButton label={strings.editor.close} onPress={onClose} style={styles.closeButton}>
                  <CloseIcon size={20} />
                </GlassButton>

                <ToolRail
                  activeTool={activeTool}
                  expandedTool={templateSheetOpen ? 'customize' : null}
                  onToggle={toggleTool}
                  compact={template !== null}
                />
              </>
            )}

            {toast && <Toast key={toast.id} text={toast.text} isError={toast.isError} onHidden={hideToast} />}

            {!dragging && activeTool === 'background' && (
              <BackgroundTray
                autoBackground={autoBackground}
                customBackground={customBackground}
                selected={background}
                magicColors={magicColors}
                onPickPhoto={choosePhoto}
                // Video needs the native recorder (iOS only): elsewhere a clip couldn't be exported.
                onPickVideo={videoRecordingSupported ? chooseVideo : undefined}
                onSelectGradient={(gradient) => {
                  hapticSelection();
                  changeBackground(gradient);
                }}
                onRandom={() => {
                  hapticSelection();
                  applyCustomBackground(createRandomBackground());
                }}
                onOpenColorPicker={() => {
                  hapticSelection();
                  setColorPickerOpen(true);
                }}
              />
            )}
            {!dragging && activeTool === 'widget' && (
              <WidgetTray
                track={track}
                selectedId={widget.id}
                configFor={configFor}
                onSelect={selectWidget}
                onOpenLibrary={() => {
                  hapticSelection();
                  setLibraryOpen(true);
                }}
              />
            )}
            {!dragging && activeTool === 'template' && (
              <TemplateTray
                background={still}
                contentFor={(target) => {
                  const content = contentFor(target);
                  return { track: trackFor(content), userName: content.owner, device: content.device };
                }}
                selectedId={template?.id ?? null}
                onSelect={selectTemplate}
                onEdit={() => {
                  hapticSelection();
                  setTemplateSheetOpen(true);
                }}
              />
            )}
            {!dragging && activeTool === 'customize' && (
              <CustomizePanel
                widget={widget}
                track={track}
                config={config}
                onChange={updateConfig}
                onEditContent={() => {
                  hapticSelection();
                  setDataSheetOpen(true);
                }}
              />
            )}
          </View>
        )}
      </View>

      {/* Without the native recorder (Android, web) photo is the only format, so there's no choice. */}
      {videoRecordingSupported && (
        <FormatToggle
          value={exportFormat}
          disabled={pendingAction !== null || backgroundVideo !== null}
          onChange={(next) => {
            hapticSelection();
            if (next === 'video' && !requirePro('video')) return;
            setFormat(next);
          }}
        />
      )}

      <BottomBar
        background={still}
        coverUrl={track.coverUrl}
        pendingAction={pendingAction}
        backgroundTrayOpen={activeTool === 'background'}
        onToggleBackgroundTray={() => toggleTool('background')}
        onShare={() => {
          if (pendingAction) return;
          setActiveTool(null);
          if (!ensureProForExport()) return;
          setShareSheetOpen(true);
        }}
        onSave={() => {
          setActiveTool(null);
          if (!ensureProForExport()) return;
          if (exportFormat === 'video') saveVideo();
          else saveStory();
        }}
      />

      <ShareSheet
        visible={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        onWithSong={async () => {
          setShareSheetOpen(false);
          // A save started while the sheet was open: the share wouldn't run, so leave the clipboard.
          if (pendingAction) return;
          // The song's name goes to the clipboard, ready to paste into Instagram's Music search.
          const shown = templateContent ?? { title: track.title, artist: track.artist ?? '' };
          const song = [shown.title, shown.artist].filter(Boolean).join(' - ');
          await Clipboard.setStringAsync(song).catch(() => undefined);
          showMessage(strings.editor.share.songCopied(song));
          shareWithMusic(exportFormat === 'video');
        }}
        onDirect={() => {
          setShareSheetOpen(false);
          if (exportFormat === 'video') shareVideo();
          else shareToStories();
        }}
      />

      <WidgetLibrarySheet
        visible={libraryOpen}
        track={track}
        selectedId={widget.id}
        configFor={configFor}
        onSelect={(next) => {
          // A locked widget opens the paywall, but only after this sheet is gone: presenting
          // one modal while another is dismissing freezes the app.
          if (next.pro && !isPro) paywallAfterLibrary.current = true;
          else selectWidget(next);
          setLibraryOpen(false);
        }}
        onClose={() => setLibraryOpen(false)}
        onClosed={() => {
          if (!paywallAfterLibrary.current) return;
          paywallAfterLibrary.current = false;
          openPaywall('widget');
        }}
      />

      <WidgetDataSheet
        visible={dataSheetOpen}
        widget={widget}
        content={config.content}
        onChange={updateContent}
        onFill={fillContent}
        onClose={() => setDataSheetOpen(false)}
      />

      {template && templateContent && (
        <TemplateDataSheet
          visible={templateSheetOpen}
          name={template.name}
          content={templateContent}
          onChange={editTemplate}
          onPickCover={pickTemplateCover}
          onClose={() => setTemplateSheetOpen(false)}
        />
      )}

      <ColorPickerSheet
        visible={colorPickerOpen}
        initialColor={pickerInitialColor}
        onClose={() => setColorPickerOpen(false)}
        onApply={(color) => {
          hapticSelection();
          applyCustomBackground(createCustomBackground(color));
          setColorPickerOpen(false);
        }}
      />

      {videoExport && (
        <ExportProgressView
          progress={videoExport.progress}
          previewUri={videoExport.previewUri}
          onCancel={cancelVideo}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: editorColors.background },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  closeButton: { position: 'absolute', top: 14, left: 14 },
});
