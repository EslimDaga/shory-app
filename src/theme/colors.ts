export const brand = {
  50: '#FBFFEB',
  100: '#F7FFD6',
  200: '#F0FFB3',
  300: '#E8FF8A',
  400: '#E0FF66',
  500: '#DAFF3E',
  600: '#CCFF00',
  700: '#97BD00',
  800: '#668000',
  900: '#313D00',
  950: '#181F00',
} as const;

export const editorColors = {
  background: '#050505',
  surface: '#131313',
  surfaceRaised: '#1C1C1C',
  hairline: 'rgba(255, 255, 255, 0.09)',
  text: '#F4F1EA',
  textMuted: 'rgba(244, 241, 234, 0.58)',
  textFaint: 'rgba(244, 241, 234, 0.3)',
  accent: brand[600],
  onAccent: brand[950],
  danger: '#FF7A66',
  glass: 'rgba(10, 10, 10, 0.38)',
  trayBackground: 'rgba(6, 6, 6, 0.8)',
  toastBackground: 'rgba(12, 12, 12, 0.86)',
  canvasPlaceholder: '#0E0E0E',
} as const;

export const homeColors = {
  ink: brand[950],
  inkMuted: '#6A6F5C',
  line: '#ECEFE2',
  card: '#FFFFFF',
  chevron: '#B9BDAE',
  error: '#C8321F',
  dark: 'rgba(24, 31, 0, 0.88)',
  darkBorder: 'rgba(204, 255, 0, 0.35)',
} as const;

export const splashColors = {
  background: '#FFFFFF',
  ink: '#0A0A09',
  track: 'rgba(10, 10, 9, 0.14)',
  orbCore: brand[600],
  orbMid: brand[400],
  orbRim: brand[200],
  orbTint: '#8CF5C8',
} as const;

export const onboardingColors = {
  background: '#FFFFFF',
  ink: '#0A0A09',
  inkMuted: '#6B6F63',
  row: '#F4F5F0',
  track: '#EDEFE6',
  progress: brand[600],
  error: '#C8321F',
} as const;
