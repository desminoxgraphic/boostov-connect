/**
 * Proves the business theme colour is the single source of truth for the
 * public profile accent system, in a real browser, for several colours in both
 * appearances.
 *
 * The page is loaded once. For each (colour, appearance) pair the inline
 * tokens that `accentTokens()` publishes are repainted, then the resolved
 * accent of every element on the page is read back with getComputedStyle.
 * Every resolved value has to belong to the chosen hue and none may be the
 * default Boostov blue.
 *
 * Phase 2 repaints ONLY `--business-accent` and checks the solid accents
 * (filled surfaces, section bars, hover arrows, welcome button) still follow,
 * which is the "one variable drives everything" guarantee.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
/* The real token builder, so the browser is painted exactly what the product
 * publishes and the contrast companions are not faked. */
import { accentTokens, buildTheme } from '../lib/connect-theme.ts';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL_UNDER_TEST = process.env.CONNECT_URL || 'http://127.0.0.1:3100/connect/qualityifni';
const PORT = 9333;

const COLORS = { red: '#e11d48', green: '#059669', purple: '#7c3aed', blue: '#2563eb' };
const DEFAULT_BLUE = { r: 0x25, g: 0x63, b: 0xeb };

/* ---------------- colour parsing / mixing ---------------- */

function parseHex(hex) {
  const d = hex.replace('#', '');
  const full = d.length === 3 ? d.split('').map((c) => c + c).join('') : d;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16), a: 1 };
}

function alphaOf(v) {
  if (v === undefined) return 1;
  const t = String(v).trim();
  if (t === 'transparent') return 0;
  if (t.endsWith('%')) return parseFloat(t) / 100;
  return parseFloat(t);
}

/** Returns { r,g,b (0-255), a } or null. Handles the notations Chrome emits. */
function parseColor(input) {
  const text = String(input ?? '').trim();
  if (!text) return null;
  if (text === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  // color-mix(in srgb, C1 P1%, C2 P2%) / color-mix(in srgb, C P%, transparent)
  const mix = text.match(/^color-mix\(\s*in\s+srgb\s*,\s*(.+)\)$/i);
  if (mix) {
    const parts = splitMix(mix[1]);
    if (parts.length !== 2) return null;
    const c1 = parseColor(parts[0].color);
    const c2 = parseColor(parts[1].color);
    if (!c1 || !c2) return null;
    let p1 = parts[0].pct / 100;
    let p2 = parts[1].pct / 100;
    const sum = p1 + p2;
    if (sum === 0) return null;
    p1 /= sum; p2 /= sum;
    const a1 = c1.a * p1, a2 = c2.a * p2;
    const alpha = a1 + a2;
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
    // Un-premultiply the standard weighted average.
    return {
      r: (c1.r * a1 + c2.r * a2) / alpha,
      g: (c1.g * a1 + c2.g * a2) / alpha,
      b: (c1.b * a1 + c2.b * a2) / alpha,
      a: alpha,
    };
  }

  // color(srgb 0.1 0.2 0.3 / 0.4)
  const srgb = text.match(/^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)$/i);
  if (srgb) {
    return { r: +srgb[1] * 255, g: +srgb[2] * 255, b: +srgb[3] * 255, a: alphaOf(srgb[4]) };
  }

  const rgb = text.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/]\s*([\d.%]+))?\s*\)$/i);
  if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3], a: alphaOf(rgb[4]) };

  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(text)) return parseHex(text);

  return null;
}

function splitMix(body) {
  const out = [];
  let depth = 0, buf = '', cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((raw) => {
    const t = raw.trim();
    const m = t.match(/^(.*?)\s*([\d.]+%)$/);
    return m ? { color: m[1].trim(), pct: parseFloat(m[2]) } : { color: t, pct: 100 };
  });
}

function hue({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min;
  if (d === 0) return null;
  let h;
  if (max === rn) h = 60 * (((gn - bn) / d) % 6);
  else if (max === gn) h = 60 * ((bn - rn) / d + 2);
  else h = 60 * ((rn - gn) / d + 4);
  return (h + 360) % 360;
}
function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
const isGrey = ({ r, g, b }) => Math.max(r, g, b) - Math.min(r, g, b) < 6;

function relLum({ r, g, b }) {
  const ch = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}
/** Contrast ratio, compositing any alpha over an assumed white page. */
function contrast(fg, bg) {
  const over = (c) => (c.a >= 1 ? c : { r: c.r * c.a + 255 * (1 - c.a), g: c.g * c.a + 255 * (1 - c.a), b: c.b * c.a + 255 * (1 - c.a), a: 1 });
  const f = over(fg), b = over(bg);
  const l1 = relLum(f), l2 = relLum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/* ---------------- CDP ---------------- */

async function cdp() {
  const profile = mkdtempSync(join(tmpdir(), 'connect-accent-'));
  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars',
    'about:blank',
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {}
  }
  if (!target) { chrome.kill(); throw new Error('Chrome did not expose a debugging target'); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP socket failed')); });

  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error('page threw: ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text));
    }
    if (!('value' in res.result)) throw new Error('no value from: ' + expression.slice(0, 80));
    return res.result.value;
  };

  return {
    evaluate,
    navigate: async (url) => {
      await send('Page.enable');
      await send('Runtime.enable');
      await send('Page.navigate', { url });
    },
    close: () => {
      ws.close(); chrome.kill();
      setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 500);
    },
  };
}

/* ---------------- in-page probe ---------------- */

const PROBE = `(function () {
  const scope = document.querySelector('.connect-scope');
  if (!scope) return { error: 'no .connect-scope on the page' };
  const scopeCs = getComputedStyle(scope);
  const out = [];

  // kind: 'accent'     -> must be the chosen hue
  //       'companion'  -> the readable-text partner, must not be a stale blue
  //       'neutral'    -> deliberately not accented
  const t = (name, kind) => out.push({ label: 'token ' + name, kind, value: scopeCs.getPropertyValue(name).trim() });
  t('--business-accent', 'accent');
  t('--brand', 'accent');
  t('--brand-hover', 'accent');
  t('--brand-soft', 'accent');
  t('--brand-soft-2', 'accent');
  t('--brand-soft-border', 'accent');
  t('--brand-deep', 'accent');
  t('--ring', 'accent');
  t('--on-brand', 'companion');
  t('--brand-text', 'companion');

  const saveBtn = Array.from(document.querySelectorAll('button')).find((b) => /save contact/i.test(b.textContent || ''));
  const bars = Array.from(document.querySelectorAll('h2.ct-section-title > span'));
  const tiles = Array.from(document.querySelectorAll('.ct-tile'));
  const rowLink = document.querySelector('a.group');
  const rowIcon = rowLink ? rowLink.querySelector('.ct-tile svg') : null;
  const chevron = rowLink ? rowLink.querySelector('.ct-tile ~ span + svg') : null;
  const footer = document.querySelector('footer a');
  const chip = document.querySelector('.ct-chip');
  const welcome = document.querySelector('.bg-brand.rounded-card');

  const push = (el, prop, label, kind) => { if (el) out.push({ label, kind, value: getComputedStyle(el)[prop] }); };

  push(saveBtn, 'backgroundColor', 'Save Contact button background', 'accent');
  out.push({ label: 'Save Contact icon', kind: 'companion',
    value: saveBtn && saveBtn.querySelector('svg') ? getComputedStyle(saveBtn.querySelector('svg')).color : 'missing',
    backdrop: saveBtn ? getComputedStyle(saveBtn).backgroundColor : 'missing' });
  push(bars[0], 'backgroundColor', 'CONTACT accent line', 'accent');
  push(bars[1], 'backgroundColor', 'LINKS & SOCIALS accent line', 'accent');
  push(tiles[0], 'backgroundColor', 'contact row icon container', 'accent');
  push(tiles[0] && tiles[0].querySelector('svg'), 'color', 'contact row icon color', 'companion');
  push(tiles[tiles.length - 1], 'backgroundColor', 'gallery icon container', 'accent');
  push(tiles[tiles.length - 1] && tiles[tiles.length - 1].querySelector('svg'), 'color', 'gallery icon', 'companion');
  push(chevron, 'color', 'chevron arrow', 'companion');
  push(footer, 'color', 'footer Boostov link', 'companion');
  push(footer, 'textDecorationColor', 'footer underline', 'accent');
  push(chip, 'backgroundColor', 'category chip background', 'accent');
  push(welcome, 'backgroundColor', 'welcome button', 'accent');
  push(rowLink, 'borderColor', 'row border (rest state)', 'neutral');
  push(scope, 'backgroundColor', 'page background', 'neutral');
  push(document.querySelector('footer'), 'borderTopColor', 'footer hairline', 'neutral');

  return { out };
})()`;

/* ---------------- driver ---------------- */

/* The solid family: nothing here needs a contrast companion, so it must follow
 * --business-accent on its own. */
const SOLID_ONLY = new Set([
  'token --business-accent',
  'token --brand',
  'token --brand-hover',
  'token --brand-soft',
  'token --brand-soft-2',
  'token --brand-soft-border',
  'token --brand-deep',
  'token --ring',
  'Save Contact button background',
  'CONTACT accent line',
  'LINKS & SOCIALS accent line',
  'welcome button',
  'footer underline',
  'category chip background',
  'contact row icon container',
  'gallery icon container',
]);

const paint = (hex, mode) => {
  const tokens = accentTokens(buildTheme(hex));
  const decls = Object.entries(tokens)
    .map(([k, v]) => `s.style.setProperty(${JSON.stringify(k)}, ${JSON.stringify(v)})`)
    .join(';');
  return `(function(){var s=document.querySelector('.connect-scope');${decls};document.documentElement.setAttribute('data-appearance',${JSON.stringify(mode)});return true;})()`;
};
const setAccentOnly = (hex, mode) => `(function(){
  var s = document.querySelector('.connect-scope');
  s.style.setProperty('--business-accent', ${JSON.stringify(hex)});
  document.documentElement.setAttribute('data-appearance', ${JSON.stringify(mode)});
  return true;
})()`;

const main = async () => {
  const { evaluate, navigate, close } = await cdp();
  const log = [];
  let failures = 0;
  const fail = (m) => { failures++; log.push('     FAIL ' + m); };
  const pass = (m) => log.push('     ok   ' + m);

  try {
    await navigate(URL_UNDER_TEST);
    await new Promise((r) => setTimeout(r, 7000));

    const ready = await evaluate("Boolean(document.querySelector('.connect-scope') && document.querySelector('.connect-scope').style.getPropertyValue('--business-accent'))");
    if (!ready) throw new Error('page not ready: ' + JSON.stringify(await evaluate(PROBE)));

    /* Phase 0: the page exactly as the database serves it, nothing repainted.
     * This is the real-world regression check -- before the fix the inline
     * accent was the business colour while every derived token was still blue. */
    {
      const asServed = await evaluate(
        "(function(){var s=document.querySelector('.connect-scope');return {inline:s.style.getPropertyValue('--business-accent'),appearance:document.documentElement.getAttribute('data-appearance')};})()"
      );
      log.push(`\n  AS SERVED (nothing repainted): inline --business-accent = ${asServed.inline}, data-appearance = ${asServed.appearance}`);
      const { out } = await evaluate(PROBE);
      const servedHue = hue(parseColor(asServed.inline) || { r: 0, g: 0, b: 0 });
      for (const row of out) {
        if (row.kind !== 'accent') continue;
        const c = parseColor(row.value);
        const h = c ? hue(c) : null;
        if (!c || c.a === 0 || h === null || isGrey(c) || hueDistance(h, servedHue) > 12) {
          fail(`as served: ${row.label} -> ${row.value} does not match the saved theme colour`);
        } else {
          pass(`${row.label} = ${row.value}`);
        }
      }
    }

    for (const [name, hex] of Object.entries(COLORS)) {
      for (const mode of ['light', 'dark']) {
        log.push(`\n  ${name} (${hex}) / ${mode}`);
        await evaluate(paint(hex, mode));
        await new Promise((r) => setTimeout(r, 200));
        const { out } = await evaluate(PROBE);
        const target = parseHex(hex);
        const targetHue = hue(target);
        const isDefaultBlue = hex === '#2563eb';

        for (const row of out) {
          if (row.kind === 'neutral') continue;

          const c = parseColor(row.value);
          if (!c) { fail(`${row.label} -> could not read "${row.value}"`); continue; }
          if (c.a === 0) { fail(`${row.label} -> fully transparent`); continue; }

          const isBlue = c.r === DEFAULT_BLUE.r && c.g === DEFAULT_BLUE.g && c.b === DEFAULT_BLUE.b && c.a === 1;

          if (row.kind === 'accent') {
            if (isBlue && !isDefaultBlue) { fail(`${row.label} -> stale default blue #2563eb`); continue; }
            const h = hue(c);
            if (h !== null && !isGrey(c) && hueDistance(h, targetHue) > 12) {
              fail(`${row.label} -> ${row.value} is hue ${h.toFixed(0)}, expected ~${targetHue.toFixed(0)}`); continue;
            }
            pass(`${row.label} = ${row.value}`);
            continue;
          }

          // companion: the readable-text partner. It must not be a stale blue
          // and it must stay legible against whatever it sits on.
          if (isBlue && !isDefaultBlue) { fail(`${row.label} -> stale default blue #2563eb`); continue; }
          if (row.backdrop) {
            const bg = parseColor(row.backdrop);
            if (bg) {
              const ratio = contrast(c, bg);
              if (ratio < 3) { fail(`${row.label} -> contrast ${ratio.toFixed(2)} against its own accent fill`); continue; }
              pass(`${row.label} = ${row.value} (contrast ${ratio.toFixed(2)} on ${row.backdrop})`);
              continue;
            }
          }
          pass(`${row.label} = ${row.value}`);
        }
      }
    }

    log.push('\n  PHASE 2: repainting ONLY --business-accent (the solid family must follow alone)');
    for (const [name, hex] of Object.entries({ red: '#e11d48', green: '#059669', purple: '#7c3aed' })) {
      await evaluate(setAccentOnly(hex, 'light'));
      await new Promise((r) => setTimeout(r, 200));
      const { out } = await evaluate(PROBE);
      const targetHue = hue(parseHex(hex));
      const rows = out.filter((r) => SOLID_ONLY.has(r.label));
      let bad = 0;
      for (const row of rows) {
        const c = parseColor(row.value);
        const h = c ? hue(c) : null;
        if (!c || c.a === 0 || h === null || isGrey(c) || hueDistance(h, targetHue) > 12) {
          fail(`${name}: ${row.label} -> ${row.value} did not follow --business-accent`);
          bad++;
        }
      }
      if (!bad) pass(`${name}: all ${rows.length} solid accents followed --business-accent alone`);
    }
  } catch (e) {
    fail(String(e && e.message ? e.message : e));
  } finally {
    close();
  }

  console.log(log.join('\n'));
  console.log(failures === 0 ? '\nALL ACCENT CHECKS PASSED' : `\n${failures} ACCENT CHECKS FAILED`);
  process.exit(failures === 0 ? 0 : 1);
};

main();
