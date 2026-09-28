import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  APPEARANCE_INIT_SCRIPT,
  CONNECT_APPEARANCE_ATTR,
  CONNECT_APPEARANCE_KEY,
  isAppearancePreference,
  resolveAppearance,
} from '../lib/connect-appearance.ts';
import {
  accentTokens,
  buildTheme,
  buildThemeForMode,
  contrastRatio,
} from '../lib/connect-theme.ts';

const HEX = /^#[0-9a-f]{6}$/;

test('the visitor preference key and attribute are stable strings', () => {
  // Both are written to localStorage / <html>, so a rename would silently
  // reset every returning visitor.
  assert.equal(CONNECT_APPEARANCE_KEY, 'boostov:connect-appearance');
  assert.equal(CONNECT_APPEARANCE_ATTR, 'data-appearance');
});

test('isAppearancePreference only accepts the three segmented values', () => {
  for (const value of ['light', 'dark', 'system']) {
    assert.equal(isAppearancePreference(value), true);
  }
  for (const value of ['', 'Dark', 'auto', null, undefined, 0, {}]) {
    assert.equal(isAppearancePreference(value), false);
  }
});

test('system follows the OS and an explicit choice ignores it', () => {
  assert.equal(resolveAppearance('system', true), 'dark');
  assert.equal(resolveAppearance('system', false), 'light');
  assert.equal(resolveAppearance('light', true), 'light');
  assert.equal(resolveAppearance('dark', false), 'dark');
});

test('the pre-paint script resolves the same way as the helpers', () => {
  assert.ok(APPEARANCE_INIT_SCRIPT.includes(CONNECT_APPEARANCE_KEY));
  assert.ok(APPEARANCE_INIT_SCRIPT.includes(CONNECT_APPEARANCE_ATTR));
  assert.ok(APPEARANCE_INIT_SCRIPT.includes("prefers-color-scheme: dark"));
  // Junk or missing storage has to fall back to the system, never throw.
  assert.ok(APPEARANCE_INIT_SCRIPT.includes("p!=='light'&&p!=='dark'&&p!=='system'"));
  assert.ok(APPEARANCE_INIT_SCRIPT.includes("setAttribute(a"));
});

test('light mode is the untouched light palette', () => {
  const light = buildTheme('#2563eb');
  assert.deepEqual(buildThemeForMode('#2563eb', 'light'), light);
});

test('dark mode retunes tints, hover and accent text for a dark surface', () => {
  const light = buildTheme('#2563eb');
  const dark = buildThemeForMode('#2563eb', 'dark');

  // Hover brightens in dark instead of darkening.
  assert.equal(light.primaryHover, light.primaryHover.toLowerCase());
  assert.notEqual(dark.primaryHover, light.primaryHover);
  assert.notEqual(dark.primaryActive, light.primaryActive);

  // Tints become dark mixes rather than pale washes.
  for (const key of ['soft', 'soft2', 'softBorder'] as const) {
    assert.match(light[key], HEX);
    assert.match(dark[key], HEX);
    assert.notEqual(dark[key], light[key]);
  }
  assert.match(dark.deep, HEX);
  assert.notEqual(dark.deep, light.deep);
});

test('accent text stays readable on a dark surface in both modes', () => {
  for (const colour of ['#2563eb', '#059669', '#d97706', '#e11d48', '#facc15', '#ffffff']) {
    const light = buildThemeForMode(colour, 'light');
    const dark = buildThemeForMode(colour, 'dark');
    assert.ok(
      contrastRatio(light.primaryText, '#ffffff') >= 4.5,
      `light accent text unreadable for ${colour}`
    );
    assert.ok(
      contrastRatio(dark.primaryText, '#11141b') >= 4.5,
      `dark accent text unreadable for ${colour}`
    );
  }
});

test('accentTokens publishes exactly one accent plus its contrast companions', () => {
  const tokens = accentTokens(buildTheme('#059669'));

  // One chosen colour. Everything else is derived from it in CSS.
  assert.equal(tokens['--business-accent'], '#059669');

  for (const key of [
    '--on-business-accent-l',
    '--on-business-accent-d',
    '--business-accent-text-l',
    '--business-accent-text-d',
  ]) {
    assert.ok(key in tokens, `missing ${key}`);
    assert.match(tokens[key], HEX);
  }

  // Light and dark companions must actually differ, otherwise the CSS
  // appearance switch would be a no-op for readable accent text.
  assert.notEqual(tokens['--business-accent-text-l'], tokens['--business-accent-text-d']);

  // The accent is the same colour in both appearances: only the surface it
  // sits on changes. Nothing else may be emitted, or a fixed blue could creep
  // back in through a stale token name.
  assert.equal(
    Object.keys(tokens).filter((key) => /soft|hover|deep|^--ring$|^--brand$/.test(key)).length,
    0
  );
});

test('the public card publishes the accent on the element CSS derives it from', () => {
  // Regression guard. A custom property is resolved on the element that
  // declares it, so if the inline accent is published on a descendant of
  // `.connect-scope`, the whole derived --brand-* family silently falls back to
  // the :root default blue and the colour only half-applies.
  const source = readFileSync(
    resolve(process.cwd(), 'components/ConnectPublicCard.tsx'),
    'utf8'
  );

  const scopeTag = source.match(/<div[^>]*className="[^"]*\bconnect-scope\b[^"]*"[^>]*>/);
  assert.ok(scopeTag, 'could not find the .connect-scope element');
  assert.match(
    scopeTag[0],
    /style=\{accent\}/,
    'the inline accent must be on the .connect-scope element itself'
  );

  // And it must not be re-published on the inner card, which would be the
  // half-applied bug all over again.
  assert.equal(
    (source.match(/style=\{accent\}/g) || []).length,
    1,
    'the accent should be published exactly once'
  );
});

test('globals.css derives every brand token from --business-accent', () => {
  const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');
  const derived = css.match(/\.connect-scope\s*\{[^}]*\}/g) || [];
  // Matched on `--brand:`, which only appears in the block that derives the
  // accent family. The appearance blocks only set the companions.
  const accentBlock = derived.find((block) => block.includes('--brand:'));

  assert.ok(accentBlock, 'no .connect-scope block derives the accent family');
  assert.match(accentBlock, /--brand:\s*var\(--business-accent/);

  for (const token of [
    '--brand:',
    '--on-brand:',
    '--brand-text:',
    '--brand-hover:',
    '--brand-soft:',
    '--brand-soft-2:',
    '--brand-soft-border:',
    '--brand-deep:',
    '--ring:',
  ]) {
    assert.ok(accentBlock.includes(token), `${token} is not derived from the accent`);
  }

  // The softer surfaces must be mixes of the accent, not fixed colours.
  for (const mix of ['--brand-soft:', '--brand-soft-2:', '--brand-soft-border:', '--ring:']) {
    const line = accentBlock.split('\n').find((l) => l.trim().startsWith(mix));
    assert.match(line, /color-mix\(in srgb, var\(--brand\)/, `${mix} is not an accent mix`);
  }

  // No per-appearance tint tokens may come back.
  assert.equal(
    /--brand-(soft|hover|deep|text)-(l|d)\b/.test(css),
    false,
    'per-appearance accent tints should have been replaced by color-mix'
  );
});

test('every theme entry stays a 6-digit hex so it can be written to CSS', () => {
  for (const mode of ['light', 'dark'] as const) {
    for (const input of ['#2563eb', '#0F172A', '#A16207', 'invalid', null, undefined]) {
      const theme = buildThemeForMode(input, mode);
      for (const [key, value] of Object.entries(theme)) {
        if (key === 'isDeep') {
          assert.equal(typeof value, 'boolean');
          continue;
        }
        if (key === 'primaryText' || key === 'onPrimary' || key === 'primary') {
          assert.match(value as string, HEX, `${mode} ${String(input)} ${key}`);
          continue;
        }
        if (key === 'ring' || key === 'shadow' || key === 'glow') {
          assert.match(value as string, /^rgba\(/, `${mode} ${String(input)} ${key}`);
          continue;
        }
        assert.match(value as string, HEX, `${mode} ${String(input)} ${key}`);
      }
    }
  }
});

/* ---------------- business logo circle ---------------- */

/** A rule is unlayered when braces balance at that point, i.e. it is not nested
 * inside @layer components/utilities. Unlayered rules beat every layered rule,
 * which is what stops a utility or theme block from squaring the circle off. */
function isUnlayered(css: string, selector: string): boolean {
  const at = css.indexOf(selector);
  if (at === -1) return false;
  const before = css.slice(0, at);
  if ((before.match(/\{/g) || []).length !== (before.match(/\}/g) || []).length) return false;
  // Only a comment may sit between the previous rule and this one. Comments are
  // stripped first, since the explanation for this rule mentions @layer itself.
  const tail = before.slice(before.lastIndexOf('}') + 1).replace(/\/\*[\s\S]*?\*\//g, '');
  return !/@layer|@media|@supports|@container/.test(tail);
}

const globals = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

test('the circular logo mask is defined once, outside every @layer', () => {
  assert.equal((globals.match(/^\.ct-avatar\s*\{/gm) || []).length, 1, 'expected one .ct-avatar rule');
  assert.ok(isUnlayered(globals, '.ct-avatar'), '.ct-avatar must be unlayered so utilities cannot override it');
});

test('.ct-avatar enforces a perfect circle that no theme can reshape', () => {
  const block = globals.match(/\.ct-avatar\s*\{([^}]*)\}/);
  assert.ok(block, 'no .ct-avatar rule');

  const required: Record<string, RegExp> = {
    'border-radius: 9999px': /border-radius:\s*9999px/,
    'overflow: hidden': /overflow:\s*hidden/,
    'display: flex': /display:\s*flex/,
    'align-items: center': /align-items:\s*center/,
    'justify-content: center': /justify-content:\s*center/,
    'aspect-ratio: 1 / 1': /aspect-ratio:\s*1\s*\/\s*1/,
    'flex-shrink: 0': /flex-shrink:\s*0/,
    'subtle background': /background-color:\s*var\(--surface\)/,
    'subtle shadow': /box-shadow:/,
  };
  for (const [label, pattern] of Object.entries(required)) {
    assert.match(block[1], pattern, `.ct-avatar is missing ${label}`);
  }
});

test('the logo image is masked and letterboxed by the same circle', () => {
  const block = globals.match(/\.ct-avatar\s*>\s*img\s*\{([^}]*)\}/);
  assert.ok(block, 'no .ct-avatar > img rule');
  assert.match(block[1], /border-radius:\s*9999px/);
  assert.match(block[1], /object-fit:\s*contain/);
});

test('the separating ring is one neutral that never changes between themes', () => {
  // Declared once in :root and never re-declared, so the ring over a cover is
  // identical in light and dark. This is what stops a dark cover from eating
  // the circle edge and making the logo read as a clipped polygon.
  assert.equal((globals.match(/--avatar-ring:/g) || []).length, 1);
  assert.match(globals, /--avatar-ring:\s*#ffffff/);

  const floating = globals.match(/\.ct-avatar-floating\s*\{([^}]*)\}/);
  assert.ok(floating, 'no .ct-avatar-floating rule');
  assert.match(floating[1], /box-shadow:/);
  assert.match(floating[1], /0 0 0 3px var\(--avatar-ring\)/);
});

test('every business logo goes through the one shared circular component', () => {
  const card = readFileSync(resolve(process.cwd(), 'components/ConnectPublicCard.tsx'), 'utf8');
  const admin = readFileSync(resolve(process.cwd(), 'app/admin/page.tsx'), 'utf8');
  const avatar = readFileSync(resolve(process.cwd(), 'components/ConnectLogoAvatar.tsx'), 'utf8');

  assert.match(card, /<ConnectLogoAvatar\b/, 'the public card must render the logo via ConnectLogoAvatar');
  assert.match(admin, /<ConnectLogoAvatar\b/, 'the admin list must render the logo via ConnectLogoAvatar');

  // The public logo overlaps the cover, so it carries the separating ring.
  assert.match(card, /<ConnectLogoAvatar[\s\S]*?ring="floating"/);

  // The ad-hoc square and rounded wrappers are gone.
  assert.equal(/logo_url[\s\S]{0,400}rounded-full/.test(card), false, 'the logo has no local radius override');
  assert.equal(/ct-tile h-12 w-12/.test(admin), false, 'the admin list logo is no longer a square tile');

  // The component itself must not add utilities that could beat .ct-avatar.
  const root = avatar.match(/className=\{cn\(\s*'ct-avatar',([\s\S]*?)\)\}/);
  assert.ok(root, 'could not find the avatar root class list');
  for (const forbidden of ['rounded-', 'overflow-']) {
    assert.equal(
      root[1].includes(forbidden),
      false,
      `.ct-avatar must not be given a "${forbidden}" utility: it would break the circular mask`
    );
  }
  // object-contain keeps a rectangular or transparent upload clean.
  assert.match(avatar, /object-contain/);
});
