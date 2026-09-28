import type { WidgetField } from './types';

// Builds the editable fields from a widget's label table; numeric keys get a number pad.
export function fields(labels: Record<string, string>, numeric: string[] = []): WidgetField[] {
  return Object.entries(labels).map(([key, label]) => ({
    key,
    label,
    kind: numeric.includes(key) ? 'number' : 'text',
  }));
}
