import type { CookieOptions } from '@supabase/ssr';

/**
 * Session cookies are only ever read and written on the server (every sign-in
 * step goes through a route handler), so they are httpOnly: page scripts can
 * never read the session.
 */
export function hardenCookie(options: CookieOptions = {}): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}
