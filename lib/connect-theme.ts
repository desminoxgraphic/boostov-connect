export const DEFAULT_THEME_COLOR = '#2563eb';

export type AppearanceMode = 'light' | 'dark';

export interface ConnectTheme {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryText: string;
  onPrimary: string;
  soft: string;
  soft2: string;
  softBorder: string;
  /** Deeper end of the accent, used for gradient fills and pressed states. */
  deep: string;
  ring: string;
  shadow: string;
  glow: string;
  isDeep: boolean;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidThemeColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_PATTERN.test(value.trim());
}

export function normalizeThemeColor(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_THEME_COLOR;
  const trimmed = value.trim();
  if (!HEX_PATTERN.test(trimmed)) return DEFAULT_THEME_COLOR;
  const digits = trimmed.replace('#', '').toLowerCase();
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((char) => char + char)
          .join('')
      : digits;
  return `#${full}`;
}

export function hexToRgb(hex: string): Rgb {
  const normalized = normalizeThemeColor(hex).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (value: number) =>
    Math.round(clamp(value, 0, 255))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l: l * 100 };

  const s = (delta / (1 - Math.abs(2 * l - 1))) * 100;
  let h: number;
  if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
  else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
  else h = 60 * ((rn - gn) / delta + 4);

  if (h < 0) h += 360;
  return { h, s, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  const m = ln - c / 2;
  return {
    r: (rgb[0] + m) * 255,
    g: (rgb[1] + m) * 255,
    b: (rgb[2] + m) * 255,
  };
}

export function hexToHsl(hex: string): Hsl {
  return rgbToHsl(hexToRgb(hex));
}

export function hslToHex(hsl: Hsl): string {
  return rgbToHex(hslToRgb(hsl));
}

function chromaFor(hsl: Hsl): number {
  if (hsl.s < 4) return 0;
  return Math.min(hsl.s * 1.25, 70);
}

function shiftLuminance(hex: string, delta: number, chroma?: number): string {
  const hsl = hexToHsl(hex);
  return hslToHex({
    h: hsl.h,
    s: chroma === undefined ? hsl.s : chroma,
    l: clamp(hsl.l + delta, 0, 100),
  });
}

function withLightness(hex: string, lightness: number, chroma?: number): string {
  const hsl = hexToHsl(hex);
  return hslToHex({
    h: hsl.h,
    s: chroma === undefined ? hsl.s : chroma,
    l: clamp(lightness, 0, 100),
  });
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(hexToRgb(foreground));
  const l2 = relativeLuminance(hexToRgb(background));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function readableTextOn(background: string): string {
  const onWhite = contrastRatio('#ffffff', background);
  const onDark = contrastRatio('#0f172a', background);
  return onWhite >= onDark ? '#ffffff' : '#0f172a';
}

function rgbaFromHex(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

/** Blends `overlay` into `base` by `weight` (0 keeps base, 1 keeps overlay). */
export function mixHex(base: string, overlay: string, weight: number): string {
  const a = hexToRgb(base);
  const b = hexToRgb(overlay);
  const w = clamp(weight, 0, 1);
  return rgbToHex({
    r: a.r + (b.r - a.r) * w,
    g: a.g + (b.g - a.g) * w,
    b: a.b + (b.b - a.b) * w,
  });
}

function ensureReadableOnWhite(hex: string): string {
  let candidate = hex;
  let guard = 0;
  while (contrastRatio(candidate, '#FFFFFF') < 4.5 && guard < 24) {
    candidate = shiftLuminance(candidate, -4);
    guard += 1;
  }
  return candidate;
}

/** Accent text has to stay legible on the dark surface, where the tint steps invert. */
function ensureReadableOnDark(hex: string): string {
  const surface = '#11141B';
  let candidate = hex;
  let guard = 0;
  while (contrastRatio(candidate, surface) < 4.5 && guard < 24) {
    candidate = shiftLuminance(candidate, 4);
    guard += 1;
  }
  return candidate;
}

export function buildTheme(input?: string | null): ConnectTheme {
  const primary = normalizeThemeColor(input);
  const hsl = hexToHsl(primary);
  const chroma = chromaFor(hsl);
  const isDeep = relativeLuminance(hexToRgb(primary)) < 0.18;

  return {
    primary,
    primaryHover: shiftLuminance(primary, -8, chroma),
    primaryActive: shiftLuminance(primary, -14, chroma),
    primaryText: ensureReadableOnWhite(primary),
    onPrimary: readableTextOn(primary),
    soft: withLightness(primary, 96, chroma),
    soft2: withLightness(primary, 92, chroma),
    softBorder: withLightness(primary, 87, chroma),
    deep: mixHex(primary, '#0B1220', 0.42),
    ring: rgbaFromHex(primary, 0.32),
    shadow: rgbaFromHex(primary, isDeep ? 0.4 : 0.2),
    glow: rgbaFromHex(primary, isDeep ? 0.16 : 0.1),
    isDeep,
  };
}

/**
 * Same business accent, retuned for a dark surface: tints become dark mixes
 * instead of pale ones, hover/active brighten rather than darken, and accent
 * text is lifted until it is readable on the dark background.
 */
export function buildThemeForMode(input: string | null | undefined, mode: AppearanceMode): ConnectTheme {
  const base = buildTheme(input);
  if (mode === 'light') return base;

  const { primary } = base;
  const chroma = chromaFor(hexToHsl(primary));

  return {
    ...base,
    primaryHover: shiftLuminance(primary, 8, chroma),
    primaryActive: shiftLuminance(primary, 16, chroma),
    primaryText: ensureReadableOnDark(primary),
    soft: mixHex('#171B24', primary, 0.18),
    soft2: mixHex('#1E232E', primary, 0.3),
    softBorder: mixHex('#2C3341', primary, 0.34),
    deep: mixHex(primary, '#05070B', 0.55),
    ring: rgbaFromHex(primary, 0.45),
    shadow: rgbaFromHex(primary, 0.26),
    glow: rgbaFromHex(primary, 0.16),
  };
}

export function themeStyle(theme: ConnectTheme): Record<string, string> {
  return {
    '--ct-primary': theme.primary,
    '--ct-primary-hover': theme.primaryHover,
    '--ct-primary-active': theme.primaryActive,
    '--ct-primary-text': theme.primaryText,
    '--ct-on-primary': theme.onPrimary,
    '--ct-soft': theme.soft,
    '--ct-soft-border': theme.softBorder,
    '--ct-ring': theme.ring,
    '--ct-shadow': theme.shadow,
    '--ct-glow': theme.glow,
    /* The same accent, published under the design-system names so any
       component can use bg-brand / text-brand-text without knowing about the
       per-business theme. */
    '--brand': theme.primary,
    '--on-brand': theme.onPrimary,
    '--brand-text': theme.primaryText,
    '--brand-hover': theme.primaryHover,
    '--brand-soft': theme.soft,
    '--brand-soft-2': theme.soft2,
    '--brand-soft-border': theme.softBorder,
    '--ring': theme.ring,
  } as Record<string, string>;
}

export const CONNECT_THEME_PRESETS: { label: string; value: string }[] = [
  { label: 'Royal Blue', value: '#2563EB' },
  { label: 'Midnight', value: '#0F172A' },
  { label: 'Rose', value: '#E11D48' },
  { label: 'Blush', value: '#DB2777' },
  { label: 'Amber', value: '#D97706' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Teal', value: '#0D9488' },
  { label: 'Violet', value: '#7C3AED' },
  { label: 'Terracotta', value: '#C2410C' },
  { label: 'Gold', value: '#A16207' },
];

/**
 * Publishes the selected business colour as the single source of truth for
 * the whole public profile accent system.
 *
 * Only `--business-accent` is an actual colour choice. Everything else in the
 * accent family -- soft tiles, borders, hover states, focus rings, gradient
 * ends -- is derived from it in CSS with `color-mix`, so no other blue can
 * survive a colour change.
 *
 * The two companions are the ones that cannot be derived: `on-accent` is the
 * readable text placed on a filled accent surface, and `accent-text` is the
 * accent used as text on a normal surface. Both depend on the surface behind
 * them, so they are emitted per appearance and selected in CSS.
 */
export function accentTokens(
  light: ConnectTheme,
  dark: ConnectTheme = buildThemeForMode(light.primary, 'dark')
): Record<string, string> {
  return {
    '--business-accent': light.primary,
    '--on-business-accent-l': light.onPrimary,
    '--on-business-accent-d': dark.onPrimary,
    '--business-accent-text-l': light.primaryText,
    '--business-accent-text-d': dark.primaryText,
  } as Record<string, string>;
}
