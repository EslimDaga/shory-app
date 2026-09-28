import { memo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { splashColors } from '@/theme/colors';

// The glow is wider than the screen. Drawing it on a canvas this much larger than the window
// lets every gradient fade to transparent inside the canvas, so no hard clipped edge shows on
// the sides — not even while the splash scales the orb up from 0.82.
const BLEED_X = 0.6;
const BLEED_Y = 0.2;

function SplashOrbBase() {
  const { width, height } = useWindowDimensions();
  const padX = width * BLEED_X;
  const padY = height * BLEED_Y;
  const canvasWidth = width + padX * 2;
  const canvasHeight = height + padY * 2;

  const cx = padX + width / 2;
  const cy = padY + height * 0.48;
  const rx = width * 0.95;
  const ry = height * 0.46;
  const tintX = padX + width * 0.08;
  const tintY = padY + height * 0.4;
  const tintRx = width * 0.6;
  const tintRy = height * 0.26;

  return (
    <Svg
      width={canvasWidth}
      height={canvasHeight}
      style={[styles.canvas, { left: -padX, top: -padY }]}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id="core" cx={cx} cy={cy} rx={rx} ry={ry} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={splashColors.orbCore} stopOpacity={1} />
          <Stop offset="0.32" stopColor={splashColors.orbCore} stopOpacity={0.95} />
          <Stop offset="0.58" stopColor={splashColors.orbMid} stopOpacity={0.62} />
          <Stop offset="0.8" stopColor={splashColors.orbRim} stopOpacity={0.28} />
          <Stop offset="1" stopColor={splashColors.background} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient
          id="tint"
          cx={tintX}
          cy={tintY}
          rx={tintRx}
          ry={tintRy}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={splashColors.orbTint} stopOpacity={0.7} />
          <Stop offset="1" stopColor={splashColors.orbTint} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#core)" />
      <Ellipse cx={tintX} cy={tintY} rx={tintRx} ry={tintRy} fill="url(#tint)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  canvas: { position: 'absolute' },
});

export const SplashOrb = memo(SplashOrbBase);
