import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { hardenCookie } from './cookie-options';

export { hardenCookie };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseAuthConfigured = Boolean(supabaseUrl && anonKey && !anonKey.includes('your-supabase'));

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * A Supabase client acting as the signed-in user: every query goes through
 * Postgres RLS with that user's JWT. Use in server components and route handlers.
 */
export function createUserClient(): SupabaseClient {
  const store = cookies();
  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(toSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, hardenCookie(options));
        } catch {
          // Server components cannot write cookies; the middleware refreshes them.
        }
      },
    },
  });
}
