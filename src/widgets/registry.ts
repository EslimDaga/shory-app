import { strings } from '@/i18n/es';
import { PILL_SIZE, PillWidget } from './PillWidget';
import { PLAYER_SIZE, PlayerWidget } from './PlayerWidget';
import { POLAROID_SIZE, PolaroidWidget } from './PolaroidWidget';
import { TICKET_SIZE, TicketWidget } from './TicketWidget';
import type { WidgetDefinition } from './types';
import { VINYL_SIZE, VinylWidget } from './VinylWidget';

export const WIDGETS: WidgetDefinition[] = [
  { id: 'player', name: strings.widgets.player, ...PLAYER_SIZE, Component: PlayerWidget },
  { id: 'vinyl', name: strings.widgets.vinyl, ...VINYL_SIZE, Component: VinylWidget },
  { id: 'polaroid', name: strings.widgets.polaroid, ...POLAROID_SIZE, Component: PolaroidWidget },
  { id: 'ticket', name: strings.widgets.ticket, ...TICKET_SIZE, Component: TicketWidget },
  { id: 'pill', name: strings.widgets.mini, ...PILL_SIZE, Component: PillWidget },
];
