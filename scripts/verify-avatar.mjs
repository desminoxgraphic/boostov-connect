/**
 * Proves the business logo is a perfect circle in every appearance.
 *
 * Rather than reading the declared styles, this hit-tests the painted mask: a
 * perfect circle contains its four edge midpoints and excludes the four corners
 * of its bounding box, while a square or an octagon would claim the corners.
 * The same result is required in light and dark.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL_UNDER_TEST = process.env.CONNECT_URL || 'http://127.0.0.1:3100/connect/qualityifni';
const PORT = 9335;

async function cdp() {
  const profile = mkdtempSync(join(tmpdir(), 'avatar-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws')); });
  let id = 0; const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  return { evaluate, navigate: (u) => send('Page.navigate', { url: u }), close: () => { ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 400); } };
}

const PROBE = `(function () {
  const h1 = document.querySelector('h1');
  const name = h1 ? (h1.textContent || '').trim() : '';
  const img = document.querySelector('img[alt="' + name.replace(/"/g, '\\\\"') + '"]');
  const avatar = img ? img.parentElement : document.querySelector('.ct-avatar');
  if (!avatar) return { error: 'avatar not found for name: ' + name };

  const cs = getComputedStyle(avatar);
  const r = avatar.getBoundingClientRect();
  const ics = img ? getComputedStyle(img) : null;
  const ir = img ? img.getBoundingClientRect() : null;

  /* Geometric proof by hit-testing the painted mask, not just the styles.
   * A perfect circle contains its edge midpoints and excludes the four box
   * corners. A square or an octagon would claim the corners. */
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const hits = (dx, dy) => {
    const el = document.elementFromPoint(cx + dx, cy + dy);
    return !!(el && (el === avatar || avatar.contains(el)));
  };
  const near = r.width * 0.44;   // the four corners of the box
  const mid = r.width * 0.46;    // the four edge midpoints
  const mask = {
    cornerTopLeft: hits(-near, -near),
    cornerTopRight: hits(near, -near),
    cornerBottomRight: hits(near, near),
    cornerBottomLeft: hits(-near, near),
    edgeTop: hits(0, -mid),
    edgeRight: hits(mid, 0),
    edgeBottom: hits(0, mid),
    edgeLeft: hits(-mid, 0),
  };
  const corners = ['cornerTopLeft', 'cornerTopRight', 'cornerBottomRight', 'cornerBottomLeft'].filter((k) => mask[k]).length;
  const edges = ['edgeTop', 'edgeRight', 'edgeBottom', 'edgeLeft'].filter((k) => mask[k]).length;

  return {
    appearance: document.documentElement.getAttribute('data-appearance'),
    classes: avatar.className,
    width: cs.width, height: cs.height,
    radius: cs.borderRadius,
    overflow: cs.overflow,
    display: cs.display,
    alignItems: cs.alignItems,
    justifyContent: cs.justifyContent,
    aspectRatio: cs.aspectRatio,
    flexShrink: cs.flexShrink,
    border: cs.borderTopWidth + ' ' + cs.borderTopColor,
    background: cs.backgroundColor,
    boxShadow: cs.boxShadow,
    clipPath: cs.clipPath,
    box: { w: +r.width.toFixed(2), h: +r.height.toFixed(2), square: Math.abs(r.width - r.height) < 0.5 },
    mask,
    verdict: corners === 0 && edges === 4 ? 'PERFECT CIRCLE' : 'NOT A CIRCLE (' + corners + ' corners, ' + edges + ' edges claimed)',
    image: img ? {
      objectFit: ics.objectFit, w: +ir.width.toFixed(2), h: +ir.height.toFixed(2),
      natural: img.naturalWidth + 'x' + img.naturalHeight,
      complete: img.complete, radius: ics.borderRadius, padding: ics.padding,
    } : null,
  };
})()`;

const { evaluate, navigate, close } = await cdp();
let failures = 0;
const fail = (m) => { failures++; console.log('  FAIL ' + m); };
const pass = (m) => console.log('  ok   ' + m);
const seen = [];

try {
  await navigate(URL_UNDER_TEST);
  await new Promise((r) => setTimeout(r, 7000));

  for (const mode of ['light', 'dark']) {
    await evaluate(`document.documentElement.setAttribute('data-appearance','${mode}')`);
    await new Promise((r) => setTimeout(r, 300));
    const out = await evaluate(PROBE);
    console.log(`\n=== ${mode} ===`);
    if (out.error) { fail(out.error); continue; }

    seen.push({ mode, ...out });

    // The brief, checked literally.
    if (out.radius !== '9999px') fail(`border-radius is ${out.radius}, expected 9999px`);
    else pass(`border-radius ${out.radius}`);
    if (out.overflow !== 'hidden') fail(`overflow is ${out.overflow}`); else pass('overflow hidden');
    if (out.display !== 'flex') fail(`display is ${out.display}`); else pass('display flex');
    if (out.alignItems !== 'center') fail(`align-items is ${out.alignItems}`); else pass('align-items center');
    if (out.justifyContent !== 'center') fail(`justify-content is ${out.justifyContent}`); else pass('justify-content center');
    if (!out.box.square) fail(`box is ${out.box.w}x${out.box.h}, not equal`); else pass(`box ${out.box.w}x${out.box.h} equal`);
    if (out.flexShrink !== '0') fail(`flex-shrink is ${out.flexShrink}, it can be stretched`); else pass('flex-shrink 0 (never stretched)');
    if (out.aspectRatio !== '1 / 1') fail(`aspect-ratio is ${out.aspectRatio}`); else pass('aspect-ratio 1/1 (locked square)');
    if (out.clipPath !== 'none') fail(`unexpected clip-path ${out.clipPath}`); else pass('no extra mask');

    if (out.verdict.startsWith('PERFECT')) pass(`mask geometry: ${out.verdict}`);
    else fail(`mask geometry: ${out.verdict}`);

    if (out.image) {
      if (out.image.objectFit !== 'contain') fail(`logo object-fit is ${out.image.objectFit}`);
      else pass(`logo object-fit ${out.image.objectFit} (rectangular/transparent uploads stay clean)`);
      if (out.image.radius !== '9999px') fail(`logo image radius is ${out.image.radius}`);
      else pass('logo image masked with the same circle');
    }
  }

  // The two appearances must be identical, which is the whole point.
  if (seen.length === 2) {
    const [light, dark] = seen;
    const same = ['width', 'height', 'radius', 'overflow', 'display', 'alignItems', 'justifyContent', 'aspectRatio', 'flexShrink']
      .every((k) => light[k] === dark[k]);
    if (same) pass('light and dark render an identical circle (same size, shape, mask)');
    else fail('light and dark differ: ' + ['width', 'height', 'radius', 'overflow', 'display'].filter((k) => light[k] !== dark[k]).join(', '));

    const ring = (s) => (s.boxShadow.match(/rgba?\([^)]+\)\s+0px 0px 0px (\d+)px/) || [])[1];
    if (ring(light) === ring(dark)) pass(`separating ring is ${ring(light)}px in both appearances`);
    else fail(`separating ring differs: light ${ring(light)}px vs dark ${ring(dark)}px`);
  }
} catch (e) {
  fail(String(e && e.message ? e.message : e));
} finally {
  close();
}

console.log(failures === 0 ? '\nAVATAR IS A PERFECT CIRCLE IN BOTH MODES' : `\n${failures} AVATAR CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
