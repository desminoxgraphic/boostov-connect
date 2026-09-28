export const ADMIN_COOKIE_NAME = 'cardify_admin_session';
export const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

const textEncoder = new TextEncoder();

export function getAdminAuthConfig(): { password: string; secret: string } | null {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!password || password.length < 12 || !secret || secret.length < 32) return null;
  return { password, secret };
}

export function isAdminAuthConfigured(): boolean {
  return getAdminAuthConfig() !== null;
}

/**
 * Safe boolean-only diagnostics. Never exposes secret values.
 */
export function getAdminAuthDiagnostic(): {
  passwordPresent: boolean;
  passwordValidLength: boolean;
  secretPresent: boolean;
  secretValidLength: boolean;
} {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  return {
    passwordPresent: typeof password === 'string' && password.length > 0,
    passwordValidLength: typeof password === 'string' && password.length >= 12,
    secretPresent: typeof secret === 'string' && secret.length > 0,
    secretValidLength: typeof secret === 'string' && secret.length >= 32,
  };
}

async function signSession(expiresAt: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, textEncoder.encode(expiresAt));
  return encodeBase64Url(new Uint8Array(digest));
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const config = getAdminAuthConfig();
  if (!config) return false;
  return constantTimeEqual(password, config.password);
}

export async function createAdminSessionValue(): Promise<string | null> {
  const config = getAdminAuthConfig();
  if (!config) return null;
  const expiresAt = (Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS).toString();
  const signature = await signSession(expiresAt, config.secret);
  return `${expiresAt}.${signature}`;
}

export async function verifyAdminSessionValue(value: string | undefined): Promise<boolean> {
  const config = getAdminAuthConfig();
  if (!config || !value) return false;
  const [expiresAt, signature] = value.split('.');
  if (!expiresAt || !signature || Number(expiresAt) <= Date.now() / 1000) return false;
  const expected = await signSession(expiresAt, config.secret);
  return constantTimeEqual(signature, expected);
}