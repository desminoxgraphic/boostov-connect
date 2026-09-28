import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_THEME_COLOR,
  buildTheme,
  contrastRatio,
  hexToHsl,
  hslToHex,
  isValidThemeColor,
  normalizeThemeColor,
  readableTextOn,
  themeStyle,
} from '../lib/connect-theme.ts';

test('normalizeThemeColor accepts 3 and 6 digit hex with or without hash', () => {
  assert.equal(normalizeThemeColor('#2563EB'), '#2563eb');
  assert.equal(normalizeThemeColor('2563eb'), '#2563eb');
  assert.equal(normalizeThemeColor('#abc'), '#aabbcc');
  assert.equal(normalizeThemeColor('  #AbC  '), '#aabbcc');
});

test('normalizeThemeColor falls back to the default for junk', () => {
  for (const bad of ['', 'red', '#12345', 'rgb(1,2,3)', null, undefined, 42, {}, '#gggggg']) {
    assert.equal(normalizeThemeColor(bad), DEFAULT_THEME_COLOR, `input: ${String(bad)}`);
  }
});

test('isValidThemeColor only accepts hex strings', () => {
  assert.equal(isValidThemeColor('#2563EB'), true);
  assert.equal(isValidThemeColor('#fff'), true);
  assert.equal(isValidThemeColor('blue'), false);
  assert.equal(isValidThemeColor(null), false);
});

test('hex and hsl round-trip without drift', () => {
  for (const hex of ['#2563eb', '#e11d48', '#059669', '#7c3aed', '#0f172a', '#ffffff', '#000000']) {
    assert.equal(hslToHex(hexToHsl(hex)), hex, `round-trip failed for ${hex}`);
  }
});

test('readableTextOn picks the higher-contrast foreground', () => {
  assert.equal(readableTextOn('#0f172a'), '#ffffff');
  assert.equal(readableTextOn('#2563eb'), '#ffffff');
  assert.equal(readableTextOn('#fde68a'), '#0f172a');
  assert.equal(readableTextOn('#ffffff'), '#0f172a');
});

test('every buildTheme output is a valid 6-digit hex', () => {
  const inputs = ['#2563EB', '#0F172A', '#FFE066', '#ffffff', '#000000', 'nonsense', '#e11d48'];
  for (const input of inputs) {
    const theme = buildTheme(input);
    for (const [key, value] of Object.entries(theme)) {
      if (key === 'isDeep') continue;
      if (key === 'ring' || key === 'shadow' || key === 'glow') {
        assert.match(value, /^rgba\(\d+, \d+, \d+, [\d.]+\)$/, `${key} on ${input}`);
        continue;
      }
      assert.match(value, /^#[0-9a-f]{6}$/, `${key} on ${input} was ${value}`);
    }
  }
});

test('onPrimary always meets WCAG AA against primary', () => {
  for (const input of ['#2563EB', '#0F172A', '#FFE066', '#ffffff', '#000000', '#e11d48', '#a16207', '#06b6d4']) {
    const theme = buildTheme(input);
    const ratio = contrastRatio(theme.onPrimary, theme.primary);
    assert.ok(ratio >= 4.5, `${input}: onPrimary ${theme.onPrimary} ratio ${ratio.toFixed(2)} < 4.5`);
  }
});

test('primaryText always stays readable on white', () => {
  for (const input of ['#FFE066', '#a7f3d0', '#fef08a', '#ffffff', '#fde68a', '#2563EB']) {
    const theme = buildTheme(input);
    const ratio = contrastRatio(theme.primaryText, '#FFFFFF');
    assert.ok(ratio >= 4.5, `${input}: primaryText ${theme.primaryText} ratio ${ratio.toFixed(2)} < 4.5`);
  }
});

test('hover and active states stay distinct from primary', () => {
  const theme = buildTheme('#2563EB');
  assert.notEqual(theme.primaryHover, theme.primary);
  assert.notEqual(theme.primaryActive, theme.primary);
  assert.notEqual(theme.primaryHover, theme.primaryActive);
  assert.ok(hexToHsl(theme.primaryHover).l < hexToHsl(theme.primary).l);
  assert.ok(hexToHsl(theme.primaryActive).l < hexToHsl(theme.primaryHover).l);
});

test('soft backgrounds stay light for every brand, light or dark', () => {
  for (const input of ['#2563EB', '#0F172A', '#000000', '#ffffff', '#e11d48', '#a16207']) {
    const theme = buildTheme(input);
    assert.ok(hexToHsl(theme.soft).l > 85, `${input}: soft too dark -> ${theme.soft}`);
    assert.ok(hexToHsl(theme.softBorder).l > 75, `${input}: softBorder too dark -> ${theme.softBorder}`);
  }
  assert.equal(buildTheme('#0F172A').isDeep, true);
  assert.equal(buildTheme('#FFE066').isDeep, false);
});

test('fully achromatic brands stay achromatic in tints', () => {
  for (const input of ['#808080', '#000000', '#ffffff', '#4d4d4d']) {
    const theme = buildTheme(input);
    const spread = (hex: string) => {
      const { r, g, b } = hexToRgbHelper(hex);
      return Math.max(r, g, b) - Math.min(r, g, b);
    };
    assert.ok(spread(theme.soft) < 8, `${input}: soft gained a hue cast -> ${theme.soft}`);
    assert.ok(spread(theme.softBorder) < 8, `${input}: softBorder gained a hue cast -> ${theme.softBorder}`);
  }
});

test('desaturated slate is only mildly boosted, never given a vivid cast', () => {
  const theme = buildTheme('#4B5563');
  const spread = (hex: string) => {
    const { r, g, b } = hexToRgbHelper(hex);
    return Math.max(r, g, b) - Math.min(r, g, b);
  };
  assert.ok(spread(theme.soft) < 30, `slate soft became vivid -> ${theme.soft}`);
});

test('themeStyle exposes every token as a CSS custom property', () => {
  const style = themeStyle(buildTheme('#e11d48'));
  assert.equal(style['--ct-primary'], '#e11d48');
  for (const key of [
    '--ct-primary-hover',
    '--ct-primary-active',
    '--ct-primary-text',
    '--ct-on-primary',
    '--ct-soft',
    '--ct-soft-border',
    '--ct-ring',
    '--ct-shadow',
    '--ct-glow',
  ]) {
    assert.ok(style[key], `missing ${key}`);
  }
});

test('buildTheme is stable for repeated calls', () => {
  assert.deepEqual(buildTheme('#2563EB'), buildTheme('#2563EB'));
});

function hexToRgbHelper(hex: string) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}
