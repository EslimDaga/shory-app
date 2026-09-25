import { strings } from '@/i18n/es';
import { PILL_SIZE, PillWidget } from './PillWidget';
import { PLAYER_SIZE, PlayerWidget } from './PlayerWidget';
import type { WidgetDefinition } from './types';

export const WIDGETS: WidgetDefinition[] = [
  { id: 'player', name: strings.widgets.player, ...PLAYER_SIZE, Component: PlayerWidget },
  { id: 'pill', name: strings.widgets.mini, ...PILL_SIZE, Component: PillWidget },
];
