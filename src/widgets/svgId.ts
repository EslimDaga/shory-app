import { useId } from 'react';

// On web every Svg shares the page's DOM, so `url(#id)` resolves to the first gradient with that id
// anywhere on the page: a canvas widget and its tray preview would paint with each other's colors.
// Native scopes ids per Svg, but one id per instance is correct on both.
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}
