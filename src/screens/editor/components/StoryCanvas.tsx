import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { editorColors } from '@/theme/colors';
import { STORY_ASPECT, STORY_WIDTH } from '@/theme/layout';
import type { GradientBackground, PhotoBackground, StoryBackground } from '@/types/storyBackground';
import { StoryBackdropContext, type StoryBackdrop } from '@/widgets/glass/StoryBackdropContext';
import { useDragAndPinch } from '../hooks/useDragAndPinch';
import { BackgroundVideo } from './BackgroundVideo';
import { InstagramSafeArea } from './InstagramSafeArea';
import { ShoryLogo } from '@/components/ShoryLogo';

type Props = {
  width: number;
  height: number;
  background: StoryBackground;
  storyRef: RefObject<View | null>;
  backgroundRef: RefObject<View | null>;
  stickerRef: RefObject<View | null>;
  resetKey: string;
  stickerSize: { width: number; height: number };
  profile: { name: string; avatarUrl: string | null };
  onDragChange?: (dragging: boolean) => void;
  onBackgroundPress?: () => void;
  // A full-story template replaces the movable widget.
  template?: ReactNode;
  // While recording, a video background is left out of the view: the recorder draws the clip's
  // original frames underneath instead.
  recording?: boolean;
  // Free plan: a small Shory mark, part of the exported image or video.
  watermark?: boolean;
  ref?: Ref<StoryCanvasHandle>;
  children: ReactNode;
};

export type StoryCanvasHandle = {
  // `watermark`: free plan, the sticker carries the Shory mark attached to the widget.
  prepareStickerCapture: (options?: { watermark?: boolean }) => Promise<() => void>;
  // Where the widget sits right now; part of what makes two video exports identical.
  currentTransform: () => { x: number; y: number; scale: number };
};

// Size of the Shory mark attached to the widget sticker, in story pixels.
const STICKER_MARK_WIDTH = 96;
// Height the mark adds next to the widget: gap + capsule (logo height ≈ width × 0.3, plus padding).
const STICKER_MARK_SPACE = 14 + STICKER_MARK_WIDTH * 0.5;

// Measured: Instagram shows a shared sticker at 75% of the story, centered.
const INSTAGRAM_STICKER_SCALE = 0.75;

const nextFrames = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export function StoryCanvas({
  width,
  height,
  background,
  storyRef,
  backgroundRef,
  stickerRef,
  resetKey,
  stickerSize,
  profile,
  onDragChange,
  onBackgroundPress,
  template,
  recording = false,
  watermark = false,
  ref,
  children,
}: Props) {
  const { translation, pinchScale, guides, dragging, panHandlers, canvasHandlers, currentTransform } =
    useDragAndPinch(resetKey);
  const [captureRegion, setCaptureRegion] = useState(1);
  // Where the mark sits on the widget while its sticker is captured (away from the nearer edge).
  const [stickerMark, setStickerMark] = useState<'above' | 'below' | null>(null);
  const [adaptiveGlass, setAdaptiveGlass] = useState(false);
  const [freezeUri, setFreezeUri] = useState<string | null>(null);
  const freezeLoaded = useRef<(() => void) | null>(null);

  useEffect(() => {
    onDragChange?.(dragging);
  }, [dragging, onDragChange]);
  const [pendingReveals, setPendingReveals] = useState(0);
  const holdReveal = useCallback(() => {
    setPendingReveals((count) => count + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setPendingReveals((count) => count - 1);
    };
  }, []);
  const canvasScale = width / STORY_WIDTH;
  const backdrop: StoryBackdrop = {
    background,
    translation,
    pinchScale,
    canvasScale,
    storyWidth: STORY_WIDTH,
    storyHeight: STORY_WIDTH * STORY_ASPECT,
    holdReveal,
    // Glass can't bake a slice of a moving clip, so over a video it's truly translucent.
    adaptive: adaptiveGlass || background.kind === 'video',
  };

  const releaseFreeze = () => {
    freezeLoaded.current?.();
    freezeLoaded.current = null;
  };

  useImperativeHandle(ref, () => ({
    currentTransform,
    // Instagram shows the full-story sticker at 75%, centered. Instead of scaling the widget up
    // (a transform upscales its rasterized pixels and blurs it), the sticker layer shrinks to the
    // central 1/factor of the story, in place: the widget doesn't move, and the native capture
    // re-renders that region at export resolution, so the widget comes out sharp and lands at its
    // real size and position once Instagram scales it down.
    prepareStickerCapture: async ({ watermark: markSticker = false } = {}) => {
      const { x, y, scale } = currentTransform();
      const widgetWidth = stickerSize.width * scale * canvasScale;
      // The attached mark (and its gap) sticks out on one side; counted on both to keep it simple.
      const markHeight = markSticker ? STICKER_MARK_SPACE * 2 : 0;
      const widgetHeight = (stickerSize.height + markHeight) * scale * canvasScale;
      const fit = Math.min(
        width / 2 / (Math.abs(x) + widgetWidth / 2),
        height / 2 / (Math.abs(y) + widgetHeight / 2),
      );
      const factor = Math.max(1, Math.min(1 / INSTAGRAM_STICKER_SCALE, fit));
      // A quick screen-resolution still hides the switch to translucent glass on screen.
      const still = await captureRef(storyRef, { format: 'jpg', quality: 0.8, result: 'tmpfile' });
      await new Promise<void>((resolve) => {
        freezeLoaded.current = resolve;
        setFreezeUri(still.startsWith('file://') ? still : `file://${still}`);
      });
      setCaptureRegion(factor);
      setAdaptiveGlass(true);
      if (markSticker) setStickerMark(y > 0 ? 'above' : 'below');
      await nextFrames();
      return () => {
        setCaptureRegion(1);
        setStickerMark(null);
        setAdaptiveGlass(false);
        requestAnimationFrame(() => requestAnimationFrame(() => setFreezeUri(null)));
      };
    },
  }));

  return (
    // Two fingers anywhere on the story resize the widget, not only when both land on it.
    <View style={[styles.clip, { width, height }]} {...(template ? null : canvasHandlers)}>
      <View ref={storyRef} collapsable={false} style={StyleSheet.absoluteFill}>
        <View ref={backgroundRef} collapsable={false} style={StyleSheet.absoluteFill}>
          {background.kind === 'video' ? (
            !recording && <BackgroundVideo uri={background.uri} />
          ) : (
            <BackgroundLayer background={background} />
          )}
        </View>

        {template && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {template}
          </View>
        )}

        <Pressable style={StyleSheet.absoluteFill} onPress={onBackgroundPress} />

        {!template && (
          <View
            ref={stickerRef}
            collapsable={false}
            style={
              captureRegion === 1
                ? StyleSheet.absoluteFill
                : [
                    styles.captureLayer,
                    {
                      left: (width - width / captureRegion) / 2,
                      top: (height - height / captureRegion) / 2,
                      width: width / captureRegion,
                      height: height / captureRegion,
                    },
                  ]
            }
            pointerEvents="box-none"
          >
            <View style={styles.center} pointerEvents="box-none">
              <Animated.View
                {...panHandlers}
                style={{
                  opacity: pendingReveals > 0 ? 0 : 1,
                  transform: [
                    { translateX: translation.x },
                    { translateY: translation.y },
                    { scale: Animated.multiply(pinchScale, canvasScale) },
                  ],
                }}
              >
                <StoryBackdropContext value={backdrop}>{children}</StoryBackdropContext>
                {/* Part of the widget's own layer, so in Instagram it moves and scales with the
                    widget and the widget can never be dragged over it. */}
                {stickerMark && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.stickerMark,
                      stickerMark === 'below' ? styles.markBelow : styles.markAbove,
                    ]}
                  >
                    <WatermarkLogo width={STICKER_MARK_WIDTH} />
                  </View>
                )}
              </Animated.View>
            </View>
          </View>
        )}

        {/* The last layer of the story: nothing (widget, template, photo) can be placed over it,
            and every export (photo, video, Instagram) is captured from this view. */}
        {watermark && <Watermark canvasWidth={width} canvasHeight={height} />}
      </View>

      {freezeUri && (
        <Image
          source={{ uri: freezeUri }}
          style={StyleSheet.absoluteFill}
          onLoad={releaseFreeze}
          onError={releaseFreeze}
        />
      )}

      <InstagramSafeArea
        visible={dragging}
        width={width}
        height={height}
        name={profile.name}
        avatarUrl={profile.avatarUrl}
      />

      {guides.vertical && <View pointerEvents="none" style={[styles.guide, styles.verticalGuide]} />}
      {guides.horizontal && <View pointerEvents="none" style={[styles.guide, styles.horizontalGuide]} />}
    </View>
  );
}

// The Shory mark on its dark, translucent capsule, legible on any background.
function WatermarkLogo({ width }: { width: number }) {
  return (
    <View
      style={[
        styles.watermarkCapsule,
        { paddingHorizontal: width * 0.2, paddingVertical: width * 0.09, borderRadius: width },
      ]}
    >
      <ShoryLogo
        width={width}
        color="rgba(255, 255, 255, 0.92)"
        trackColor="rgba(255, 255, 255, 0.3)"
        animateBar={false}
      />
    </View>
  );
}

// Low enough to read as a signature, high enough to clear Instagram's reply bar.
function Watermark({ canvasWidth, canvasHeight }: { canvasWidth: number; canvasHeight: number }) {
  return (
    <View pointerEvents="none" style={[styles.watermark, { bottom: canvasHeight * 0.13 }]}>
      <WatermarkLogo width={canvasWidth * 0.17} />
    </View>
  );
}

function BackgroundLayer({ background }: { background: GradientBackground | PhotoBackground }) {
  if (background.kind === 'photo') {
    return <Image source={{ uri: background.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />;
  }
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id="story-background" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={background.top} />
          <Stop offset="1" stopColor={background.bottom} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#story-background)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  clip: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: editorColors.canvasPlaceholder,
  },
  captureLayer: { position: 'absolute' },
  watermarkCapsule: { backgroundColor: 'rgba(0, 0, 0, 0.32)' },
  // In the widget's coordinates (story pixels), centered on it.
  stickerMark: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  markBelow: { top: '100%', marginTop: 14 },
  markAbove: { bottom: '100%', marginBottom: 14 },
  watermark: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guide: { position: 'absolute', backgroundColor: editorColors.accent },
  verticalGuide: { top: 0, bottom: 0, left: '50%', width: 1, marginLeft: -0.5 },
  horizontalGuide: { left: 0, right: 0, top: '50%', height: 1, marginTop: -0.5 },
});
