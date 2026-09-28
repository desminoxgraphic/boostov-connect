import { cookies } from 'next/headers';
import {
  ADMIN_COOKIE_NAME,
  SESSION_LIFETIME_SECONDS,
  createAdminSessionValue,
  isAdminAuthConfigured,
  verifyAdminPassword,
  verifyAdminSessionValue,
} from './session';

export { ADMIN_COOKIE_NAME, isAdminAuthConfigured, verifyAdminPassword, verifyAdminSessionValue };

export async function setAdminCookie(): Promise<boolean> {
  const value = await createAdminSessionValue();
  if (!value) return false;
  cookies().set(ADMIN_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_LIFETIME_SECONDS,
  });
  return true;
}

export function removeAdminCookie() {
  cookies().delete(ADMIN_COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  return verifyAdminSessionValue(cookies().get(ADMIN_COOKIE_NAME)?.value);
}