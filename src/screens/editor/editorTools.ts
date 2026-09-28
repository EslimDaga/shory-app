import type { ComponentType } from 'react';
import { SlidersIcon, StickerIcon, TemplateIcon, type IconProps } from '@/components/Icons';
import { strings } from '@/i18n/es';
import type { WidgetTone } from '@/widgets/types';

export type EditorTool = 'background' | 'widget' | 'customize' | 'template';

export type RailTool = Exclude<EditorTool, 'background'>;

export const RAIL_TOOLS: { id: RailTool; label: string; Icon: ComponentType<IconProps> }[] = [
  { id: 'widget', label: strings.editor.tools.widget, Icon: StickerIcon },
  { id: 'customize', label: strings.editor.tools.customize, Icon: SlidersIcon },
  { id: 'template', label: strings.editor.tools.template, Icon: TemplateIcon },
];

export const WIDGET_TONES: { id: WidgetTone; label: string }[] = [
  { id: 'glass', label: strings.editor.tones.glass },
  { id: 'dark', label: strings.editor.tones.dark },
  { id: 'light', label: strings.editor.tones.light },
  { id: 'accent', label: strings.editor.tones.accent },
];
