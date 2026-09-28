import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_COOKIE_NAME,
  SESSION_LIFETIME_SECONDS,
  createAdminSessionValue,
  getAdminAuthConfig,
  getAdminAuthDiagnostic,
  isAdminAuthConfigured,
  verifyAdminPassword,
  verifyAdminSessionValue,
} from '../lib/session.ts';

const ORIGINAL_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ORIGINAL_AUTH_SECRET = process.env.AUTH_SECRET;

test.after(() => {
  if (ORIGINAL_ADMIN_PASSWORD === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = ORIGINAL_ADMIN_PASSWORD;
  if (ORIGINAL_AUTH_SECRET === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = ORIGINAL_AUTH_SECRET;
});

test('config requires a 12+ character password and 32+ character secret', () => {
  delete process.env.ADMIN_PASSWORD;
  delete process.env.AUTH_SECRET;
  assert.equal(isAdminAuthConfigured(), false);
  assert.equal(getAdminAuthConfig(), null);

  process.env.ADMIN_PASSWORD = 'short';
  process.env.AUTH_SECRET = 'a'.repeat(32);
  assert.equal(isAdminAuthConfigured(), false);

  process.env.ADMIN_PASSWORD = 'valid-admin-password';
  process.env.AUTH_SECRET = 'short';
  assert.equal(isAdminAuthConfigured(), false);

  process.env.ADMIN_PASSWORD = 'valid-admin-password';
  process.env.AUTH_SECRET = 'a'.repeat(32);
  assert.equal(isAdminAuthConfigured(), true);
});

test('password verification rejects wrong, empty, and missing values', async () => {
  process.env.ADMIN_PASSWORD = 'correct-horse-battery';
  process.env.AUTH_SECRET = 'a'.repeat(32);
  assert.equal(await verifyAdminPassword('correct-horse-battery'), true);
  assert.equal(await verifyAdminPassword('wrong-value'), false);
  assert.equal(await verifyAdminPassword(''), false);

  delete process.env.ADMIN_PASSWORD;
  assert.equal(await verifyAdminPassword('correct-horse-battery'), false);
});

test('diagnostics expose booleans only, never secret values', () => {
  process.env.ADMIN_PASSWORD = 'correct-horse-battery';
  process.env.AUTH_SECRET = 'b'.repeat(32);
  const d = getAdminAuthDiagnostic();
  assert.deepEqual(d, {
    passwordPresent: true,
    passwordValidLength: true,
    secretPresent: true,
    secretValidLength: true,
  });
  const serialized = JSON.stringify(d);
  assert.ok(!serialized.includes('battery') && !serialized.includes('bbbb'));
});

test('created session values verify, are tamper-proof, and reject malformed input', async () => {
  process.env.ADMIN_PASSWORD = 'correct-horse-battery';
  process.env.AUTH_SECRET = 'c'.repeat(32);
  const value = await createAdminSessionValue();
  assert.ok(value && value.split('.').length === 2);
  assert.equal(verifyAdminSessionValue(value).catch(() => false) instanceof Promise, true);
  assert.equal(await verifyAdminSessionValue(value), true);
  assert.equal(await verifyAdminSessionValue(undefined), false);
  assert.equal(await verifyAdminSessionValue('no-dot-separator'), false);

  const [expiresAt, signature] = value.split('.');
  assert.equal(await verifyAdminSessionValue(`${expiresAt}.${signature}TAMPERED`), false);
  assert.equal(await verifyAdminSessionValue(`9999999999.${signature}`), false);
});

test('cookie name and session lifetime are stable', () => {
  assert.equal(ADMIN_COOKIE_NAME, 'cardify_admin_session');
  assert.equal(SESSION_LIFETIME_SECONDS, 7 * 24 * 60 * 60);
});

test('expired sessions are rejected', async () => {
  process.env.ADMIN_PASSWORD = 'correct-horse-battery';
  process.env.AUTH_SECRET = 'e'.repeat(32);
  const expired = (Math.floor(Date.now() / 1000) - 60).toString();
  const value = await createAdminSessionValue();
  const [, signature] = value.split('.');
  assert.equal(await verifyAdminSessionValue(`${expired}.${signature}`), false);
});