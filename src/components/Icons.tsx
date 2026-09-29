import type { IconWeight } from 'phosphor-react-native';
import { ArrowLeft } from 'phosphor-react-native/src/icons/ArrowLeft';
import { ArrowUpRight } from 'phosphor-react-native/src/icons/ArrowUpRight';
import { Camera } from 'phosphor-react-native/src/icons/Camera';
import { CaretRight } from 'phosphor-react-native/src/icons/CaretRight';
import { Check } from 'phosphor-react-native/src/icons/Check';
import { Clock } from 'phosphor-react-native/src/icons/Clock';
import { CircleHalf } from 'phosphor-react-native/src/icons/CircleHalf';
import { DiceFive } from 'phosphor-react-native/src/icons/DiceFive';
import { DotsThree } from 'phosphor-react-native/src/icons/DotsThree';
import { DownloadSimple } from 'phosphor-react-native/src/icons/DownloadSimple';
import { EnvelopeSimple } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { Eye } from 'phosphor-react-native/src/icons/Eye';
import { Headphones } from 'phosphor-react-native/src/icons/Headphones';
import { FilmSlate } from 'phosphor-react-native/src/icons/FilmSlate';
import { FilmStrip } from 'phosphor-react-native/src/icons/FilmStrip';
import { Heart } from 'phosphor-react-native/src/icons/Heart';
import { EyeSlash } from 'phosphor-react-native/src/icons/EyeSlash';
import { ImageSquare } from 'phosphor-react-native/src/icons/ImageSquare';
import { PencilSimple } from 'phosphor-react-native/src/icons/PencilSimple';
import { PaperPlaneTilt } from 'phosphor-react-native/src/icons/PaperPlaneTilt';
import { Plus } from 'phosphor-react-native/src/icons/Plus';
import { Question } from 'phosphor-react-native/src/icons/Question';
import { Sparkle } from 'phosphor-react-native/src/icons/Sparkle';
import { SlidersHorizontal } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { SquaresFour } from 'phosphor-react-native/src/icons/SquaresFour';
import { Sticker } from 'phosphor-react-native/src/icons/Sticker';
import { Timer } from 'phosphor-react-native/src/icons/Timer';
import { X } from 'phosphor-react-native/src/icons/X';
import { editorColors } from '@/theme/colors';

export type IconProps = { size?: number; color?: string };

const WEIGHT: IconWeight = 'bold';

export function CloseIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <X size={size} color={color} weight={WEIGHT} />;
}

export function DownloadIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <DownloadSimple size={size} color={color} weight={WEIGHT} />;
}

export function CheckIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <Check size={size} color={color} weight={WEIGHT} />;
}

export function GalleryIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <ImageSquare size={size} color={color} weight={WEIGHT} />;
}

export function CameraIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <Camera size={size} color={color} weight={WEIGHT} />;
}

export function ArrowUpRightIcon({ size = 20, color = editorColors.text }: IconProps) {
  return <ArrowUpRight size={size} color={color} weight={WEIGHT} />;
}

export function StickerIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <Sticker size={size} color={color} weight={WEIGHT} />;
}

export function ToneIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <CircleHalf size={size} color={color} weight={WEIGHT} />;
}

export function ChevronRightIcon({ size = 16, color = editorColors.text }: IconProps) {
  return <CaretRight size={size} color={color} weight={WEIGHT} />;
}

export function DiceIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <DiceFive size={size} color={color} weight={WEIGHT} />;
}

export function PlusIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <Plus size={size} color={color} weight={WEIGHT} />;
}

export function MailIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <EnvelopeSimple size={size} color={color} weight={WEIGHT} />;
}

export function EyeIcon({
  size = 22,
  color = editorColors.text,
  off = false,
}: IconProps & { off?: boolean }) {
  return off ? (
    <EyeSlash size={size} color={color} weight={WEIGHT} />
  ) : (
    <Eye size={size} color={color} weight={WEIGHT} />
  );
}

export function BackIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <ArrowLeft size={size} color={color} weight={WEIGHT} />;
}

export function QuestionIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <Question size={size} color={color} weight={WEIGHT} />;
}

export function SlidersIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <SlidersHorizontal size={size} color={color} weight={WEIGHT} />;
}

export function LibraryIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <SquaresFour size={size} color={color} weight={WEIGHT} />;
}

export function HeadphonesIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <Headphones size={size} color={color} weight={WEIGHT} />;
}

export function ClockIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <Clock size={size} color={color} weight={WEIGHT} />;
}

export function TimerIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <Timer size={size} color={color} weight={WEIGHT} />;
}

export function DotsIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <DotsThree size={size} color={color} weight={WEIGHT} />;
}

export function HeartIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <Heart size={size} color={color} weight={WEIGHT} />;
}

export function SendIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <PaperPlaneTilt size={size} color={color} weight={WEIGHT} />;
}

export function PencilIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <PencilSimple size={size} color={color} weight={WEIGHT} />;
}

export function SparkleIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <Sparkle size={size} color={color} weight="fill" />;
}

export function VideoIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <FilmStrip size={size} color={color} weight={WEIGHT} />;
}

export function TemplateIcon({ size = 22, color = editorColors.text }: IconProps) {
  return <FilmSlate size={size} color={color} weight={WEIGHT} />;
}
