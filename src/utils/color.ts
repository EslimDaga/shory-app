type Rgb = [number, number, number];

function parseHex(hex: string): Rgb {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join('') : clean;
  const value = parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

export function mixColors(hex: string, target: string, amount: number): string {
  const from = parseHex(hex);
  const to = parseHex(target);
  return toHex(from.map((v, i) => v + (to[i] - v) * amount) as Rgb);
}

export function relativeLuminance(hex: string): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = parseHex(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isLightColor(hex: string): boolean {
  return relativeLuminance(hex) > 0.45;
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function rgbToHex(red: number, green: number, blue: number): string {
  return toHex([red, green, blue]);
}

export type Hsv = { h: number; s: number; v: number };

export function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return toHex([f(5) * 255, f(3) * 255, f(1) * 255]);
}

export function hexToHsv(hex: string): Hsv {
  const [r, g, b] = parseHex(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let h = 0;
  if (delta > 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  return { h: (h + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

const between = (min: number, max: number, random: () => number) => min + (max - min) * random();

export function randomGradientColors(random: () => number = Math.random): { top: string; bottom: string } {
  const hue = between(0, 360, random);
  const shift = between(18, 48, random) * (random() > 0.5 ? 1 : -1);
  const top = hsvToHex({ h: hue, s: between(0.45, 0.85, random), v: between(0.86, 1, random) });
  const bottom = hsvToHex({
    h: (hue + shift + 360) % 360,
    s: between(0.65, 0.95, random),
    v: between(0.3, 0.52, random),
  });
  return { top, bottom };
}
