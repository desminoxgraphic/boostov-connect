import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  apiStatusFor,
  areaForPath,
  decideAccess,
  pageRedirectFor,
  type AccessContext,
} from '../lib/access.ts';
import {
  describeMerchantDbError,
  nextFreeSlug,
  parseMerchantLimit,
  slugify,
  validatePassword,
  validateResellerInput,
} from '../lib/reseller-validation.ts';
import {
  buildWhatsAppUrl,
  connectStatsUrl,
  growPublicUrl,
  merchantPublicUrl,
  whatsappDigits,
} from '../lib/app-url.ts';
import { removedImagePaths, storagePathFromUrl } from '../lib/reseller-merchants.ts';
import { checkResellerImages } from '../lib/reseller-connect.ts';

const base: AccessContext = {
  userId: 'u1',
  email: 'x@example.com',
  role: null,
  aal: 'aal1',
  hasTotp: false,
  resellerStatus: null,
};
const admin = (over: Partial<AccessContext> = {}): AccessContext => ({ ...base, role: 'super_admin', ...over });
const reseller = (over: Partial<AccessContext> = {}): AccessContext => ({
  ...base,
  role: 'reseller',
  resellerStatus: 'active',
  ...over,
});

// ---------------------------------------------------------------- access rules

test('anonymous visitors are sent to sign in', () => {
  assert.equal(decideAccess('admin', null), 'login');
  assert.equal(decideAccess('reseller', null), 'login');
  assert.equal(apiStatusFor('login'), 401);
});

test('a reseller is rejected from the admin area, even with the URL', () => {
  const d = decideAccess('admin', reseller({ aal: 'aal2', hasTotp: true }));
  assert.equal(d, 'forbidden');
  assert.equal(apiStatusFor(d), 403);
  assert.equal(pageRedirectFor('admin', d), null); // 404, no hint
  assert.equal(decideAccess('admin-mfa', reseller()), 'forbidden');
});

test('admin 2FA is optional, and enforced once turned on', () => {
  assert.equal(decideAccess('admin', admin()), 'allow');
  assert.equal(decideAccess('admin', admin({ hasTotp: true, aal: 'aal1' })), 'mfa');
  assert.equal(decideAccess('admin', admin({ hasTotp: true, aal: 'aal2' })), 'allow');
  assert.equal(pageRedirectFor('admin', 'mfa'), '/admin/mfa');
  assert.equal(apiStatusFor('mfa'), 403);
});

test('reseller states: active allowed, invited goes to sign-in, suspended blocked', () => {
  assert.equal(decideAccess('reseller', reseller()), 'allow');
  assert.equal(decideAccess('reseller', reseller({ resellerStatus: 'pending' })), 'login');
  assert.equal(decideAccess('reseller', reseller({ resellerStatus: 'suspended' })), 'suspended');
  assert.equal(decideAccess('reseller', admin({ aal: 'aal2', hasTotp: true })), 'forbidden');
});

test('protected paths map to the right area', () => {
  assert.equal(areaForPath('/admin'), 'admin');
  assert.equal(areaForPath('/admin/resellers/abc/space'), 'admin');
  assert.equal(areaForPath('/api/admin/resellers'), 'admin');
  assert.equal(areaForPath('/admin/login'), null);
  assert.equal(areaForPath('/admin/mfa'), 'admin-mfa');
  assert.equal(areaForPath('/dashboard/merchants/new'), 'reseller');
  assert.equal(areaForPath('/api/reseller/assets'), 'reseller');
  assert.equal(areaForPath('/m/cafe'), null);
  assert.equal(areaForPath('/connect/dashboard/tok'), null);
});

// ---------------------------------------------------------------- validation

test('password rules', () => {
  assert.ok(validatePassword('short1'));
  assert.ok(validatePassword('onlyletterslong'));
  assert.equal(validatePassword('boostov2026x'), null);
});

test('reseller input: default limit 10, Grow off unless set', () => {
  const r = validateResellerInput({ name: 'Karim', email: 'KARIM@Example.com ', phone: '+212 6 12 34 56 78' });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.merchant_limit, 10);
    assert.equal(r.value.grow_enabled, false);
    assert.equal(r.value.email, 'karim@example.com');
  }
  assert.equal(validateResellerInput({ name: 'K', email: 'bad', phone: '0612345678' }).ok, false);
  assert.equal(parseMerchantLimit('-1'), null);
  assert.equal(parseMerchantLimit('25'), 25);
  assert.equal(parseMerchantLimit('2.5'), null);
});

test('slugs: accents stripped, collisions numbered', () => {
  assert.equal(slugify('Café Atlas — Ifni!'), 'cafe-atlas-ifni');
  assert.equal(slugify('***'), 'merchant');
  assert.match(slugify('x'.repeat(80)), /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(nextFreeSlug('cafe', new Set(['cafe', 'cafe-2'])), 'cafe-3');
  assert.equal(nextFreeSlug('cafe', new Set()), 'cafe');
});

const prefix = 'https://p.supabase.co/storage/v1/object/public/business-assets/resellers/r1/';

test('reseller cards: only their own uploads, max 6 photos', () => {
  assert.equal(checkResellerImages({ logo_url: 'https://evil.example/x.png' }, prefix), 'Please upload the images again.');
  assert.ok(checkResellerImages({ gallery_images: Array.from({ length: 7 }, (_, i) => `${prefix}m/${i}.webp`) }, prefix));
  assert.equal(checkResellerImages({ logo_url: `${prefix}m/logo.webp`, cover_image_url: '', gallery_images: [`${prefix}m/1.webp`] }, prefix), null);
});

test('reseller form is the admin form, without Grow', () => {
  const page = readFileSync(resolve('app/dashboard/merchants/new/page.tsx'), 'utf8');
  assert.match(page, /<ConnectBusinessCreateForm variant="reseller" \/>/);
  const adminPage = readFileSync(resolve('app/admin/(panel)/connect/new/page.tsx'), 'utf8');
  assert.match(adminPage, /<ConnectBusinessCreateForm variant="admin" \/>/);
  for (const file of walk(resolve('app/dashboard')).concat([resolve('components/ConnectBusinessCreateForm.tsx')])) {
    assert.ok(!/grow/i.test(readFileSync(file, 'utf8')), `${file} mentions Grow`);
  }
});

test('database rule errors become clear messages', () => {
  assert.equal(describeMerchantDbError('ERROR: MERCHANT_LIMIT_REACHED').status, 409);
  assert.equal(describeMerchantDbError('ERROR: MERCHANT_LIMIT_REACHED').code, 'limit');
  assert.equal(describeMerchantDbError('GROW_NOT_ENABLED').status, 403);
  assert.equal(describeMerchantDbError('duplicate key value').code, 'slug');
});

// ---------------------------------------------------------------- links

test('links are built from the configured app URL', () => {
  assert.equal(merchantPublicUrl('cafe', 'https://app.example'), 'https://app.example/m/cafe');
  assert.equal(connectStatsUrl('tok', 'https://app.example'), 'https://app.example/connect/dashboard/tok');
  assert.equal(growPublicUrl('cafe', 'https://grow.example'), 'https://grow.example/s/cafe');
});

test('WhatsApp links use digits only with country code', () => {
  assert.equal(whatsappDigits('+212 789-216-699'), '212789216699');
  assert.equal(whatsappDigits('0612345678'), '212612345678');
  assert.equal(whatsappDigits('00212612345678'), '212612345678');
  assert.match(buildWhatsAppUrl('+212789216699', 'Salam & bienvenue'), /^https:\/\/wa\.me\/212789216699\?text=Salam%20%26%20bienvenue$/);
});

test('only images inside the reseller folder are cleaned up', () => {
  const url = `${prefix}m1/logo-1.webp`;
  assert.equal(storagePathFromUrl(url), 'resellers/r1/m1/logo-1.webp');
  const removed = removedImagePaths(
    [url, `${prefix}m1/g-1.webp`, 'https://p.supabase.co/storage/v1/object/public/business-assets/businesses/x/logo.png'],
    [`${prefix}m1/g-1.webp`],
    'resellers/r1/'
  );
  assert.deepEqual(removed, ['resellers/r1/m1/logo-1.webp']);
});

// ---------------------------------------------------------------- code contracts

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test('every admin API route checks the super admin server-side', () => {
  const files = walk(resolve('app/api/admin')).filter((f) => f.endsWith('route.ts'));
  assert.ok(files.length >= 6);
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const handlers = src.match(/export async function (GET|POST|PUT|PATCH|DELETE)/g) ?? [];
    const gates = src.match(/requireApi\('admin'\)/g) ?? [];
    assert.ok(handlers.length > 0 && gates.length >= handlers.length, `${file} must gate every handler`);
  }
});

test('every reseller API route checks the reseller server-side', () => {
  const files = walk(resolve('app/api/reseller')).filter((f) => f.endsWith('route.ts'));
  assert.ok(files.length >= 5);
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const handlers = src.match(/export async function (GET|POST|PUT|PATCH|DELETE)/g) ?? [];
    const gates = src.match(/requireApi\('reseller'\)/g) ?? [];
    assert.ok(handlers.length > 0 && gates.length >= handlers.length, `${file} must gate every handler`);
  }
});

test('the old single-password admin login is gone', () => {
  for (const file of walk(resolve('app')).concat(walk(resolve('lib')))) {
    if (!/\.(ts|tsx)$/.test(file) || file.includes('dev-preview')) continue;
    const src = readFileSync(file, 'utf8');
    assert.ok(!src.includes('ADMIN_PASSWORD'), `${file} still references ADMIN_PASSWORD`);
    assert.ok(!src.includes('cardify_admin_session'), `${file} still references the old cookie`);
  }
});

test('setup links are only consumed by POST, never by opening the page', () => {
  const page = readFileSync(resolve('app/auth/confirm/page.tsx'), 'utf8');
  const route = readFileSync(resolve('app/api/auth/confirm/route.ts'), 'utf8');
  assert.ok(!page.includes('verifyOtp'));
  const form = readFileSync(resolve('components/ConfirmLinkForm.tsx'), 'utf8');
  assert.match(form, /method="post"/);
  assert.match(route, /bx_used_link/);
  assert.match(route, /export async function POST/);
  assert.ok(!/export async function GET/.test(route));
});

test('the public profile API never returns the secret stats token', () => {
  const src = readFileSync(resolve('app/api/connect/profile/route.ts'), 'utf8');
  assert.match(src, /dashboard_token: _token/);
  assert.ok(!src.includes('NextResponse.json(data)'));
});

test('no domain is hardcoded for merchant or stats links', () => {
  for (const file of walk(resolve('app')).concat(walk(resolve('components')), walk(resolve('lib')))) {
    if (!/\.(ts|tsx)$/.test(file) || file.includes('dev-preview')) continue;
    const src = readFileSync(file, 'utf8');
    assert.ok(!src.includes('boostov-connect.vercel.app'), `${file} hardcodes the app domain`);
  }
});

test('migration closes the token leak and enforces reseller rules in the database', () => {
  const sql = readFileSync(resolve('supabase/migrations/202610300001_add_reseller_layer.sql'), 'utf8');
  assert.match(sql, /drop policy if exists "Public active connect business reads"/);
  assert.match(sql, /drop policy if exists "Public active connect link reads"/);
  assert.match(sql, /MERCHANT_LIMIT_REACHED/);
  assert.match(sql, /GROW_NOT_ENABLED/);
  assert.match(sql, /for update/);
  assert.match(sql, /'aal2'/);
  const optional = readFileSync(resolve('supabase/migrations/202610300002_optional_admin_2fa.sql'), 'utf8');
  assert.match(optional, /mfa_factors/);
  assert.ok(!/drop column/i.test(sql), 'migration must be additive');
  assert.ok(!/drop table/i.test(sql), 'migration must be additive');
});

test('public cards are rendered on the server and never fetch the card in the browser', () => {
  const view = readFileSync(resolve('components/ConnectProfileView.tsx'), 'utf8');
  assert.ok(!view.includes('/api/connect/profile'));
  for (const page of ['app/connect/[slug]/page.tsx', 'app/m/[slug]/page.tsx']) {
    assert.match(readFileSync(resolve(page), 'utf8'), /loadPublicCard/);
  }
  const loader = readFileSync(resolve('lib/public-card.ts'), 'utf8');
  assert.match(loader, /dashboard_token: _token/);
  const config = readFileSync(resolve('next.config.js'), 'utf8');
  assert.ok(!/unoptimized:\s*true/.test(config), 'images must be optimized');
});

test('tap counts are de-duplicated per visitor and the public key cannot write events', () => {
  const route = readFileSync(resolve('app/api/connect/events/route.ts'), 'utf8');
  assert.match(route, /visitorId\(request\.headers\)/);
  assert.match(route, /MAX_EVENTS_PER_VISITOR_HOUR/);
  const sql = readFileSync(resolve('supabase/migrations/202610310001_protect_tap_counts.sql'), 'utf8');
  assert.match(sql, /drop policy if exists "Public event insert"/);
});

test('one login page: invite-only, Google or email code, password only until the admin used it', () => {
  const send = readFileSync(resolve('app/api/auth/otp/send/route.ts'), 'utf8');
  assert.match(send, /invited_access/);
  assert.match(send, /shouldCreateUser: false/);
  const post = readFileSync(resolve('lib/post-login.ts'), 'utf8');
  assert.match(post, /deleteUser\(ctx\.userId\)/, 'an uninvited Google sign-up is removed again');
  const pw = readFileSync(resolve('app/api/auth/login/route.ts'), 'utf8');
  assert.match(pw, /passwordLoginEnabled\(\)/);
  assert.equal(pageRedirectFor('admin', 'login'), '/login');
  assert.equal(pageRedirectFor('reseller', 'login'), '/login');
});
