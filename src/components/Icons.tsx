import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { editorColors } from '@/theme/colors';

export type IconProps = { size?: number; color?: string };

const stroke = (color: string) => ({
  fill: 'none',
  stroke: color,
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function CloseIcon({ size = 22, color = editorColors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function ShareIcon({ size = 22, color = editorColors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="M12 14.5V3.5M8 7.5l4-4 4 4M8.5 10.5H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1.5" />
    </Svg>
  );
}

export function CheckIcon({ size = 22, color = editorColors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function GalleryIcon({ size = 22, color = editorColors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Rect x={3.5} y={4.5} width={17} height={15} rx={3} />
      <Circle cx={9} cy={10} r={1.6} />
      <Path d="m4 17 4.8-4.4 3.2 2.9 3-2.6 5 4.3" />
    </Svg>
  );
}

export function CameraIcon({ size = 22, color = editorColors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="M4 8.5A2 2 0 0 1 6 6.5h2l1.4-2h5.2l1.4 2h2a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <Circle cx={12} cy={12.5} r={3.4} />
    </Svg>
  );
}

export function ClipboardIcon({ size = 20, color = editorColors.background }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Rect x={5.5} y={5} width={13} height={16} rx={2.5} />
      <Path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h4" />
    </Svg>
  );
}

export function ArrowUpRightIcon({ size = 20, color = editorColors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="M7 17 17 7M9 7h8v8" />
    </Svg>
  );
}

export function StickerIcon({ size = 22, color = editorColors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="M20 12.5V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h5.5Z" />
      <Path d="M20 12.5 12.5 20v-4.5a3 3 0 0 1 3-3Z" />
      <Path d="M9 10.5h.01M14 10.5h.01" strokeWidth={2.4} />
    </Svg>
  );
}

export function ToneIcon({ size = 22, color = editorColors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill={color} />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 16, color = editorColors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)} strokeWidth={2.4}>
      <Path d="m9 5 7 7-7 7" />
    </Svg>
  );
}
