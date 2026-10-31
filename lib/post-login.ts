import type { SupabaseClient } from '@supabase/supabase-js';
import { loadAccessContext } from './authz-edge';
import { supabaseServer } from './supabase/server';

export type PostLoginResult =
  | { ok: true; next: string }
  | { ok: false; code: 'no_access' | 'suspended' | 'error' };

/**
 * Runs right after any successful sign-in (Google, email code, emergency link).
 * Decides where the person goes, and turns away anyone who was not invited.
 * A stranger who just created an account through Google is deleted again, so
 * an uninvited attempt leaves nothing behind.
 */
export async function afterSignIn(supabase: SupabaseClient, method: 'google' | 'code' | 'link'): Promise<PostLoginResult> {
  const ctx = await loadAccessContext(supabase);
  if (!ctx) return { ok: false, code: 'error' };

  if (!ctx.role) {
    await supabase.auth.signOut();
    if (supabaseServer) await supabaseServer.auth.admin.deleteUser(ctx.userId).catch(() => {});
    return { ok: false, code: 'no_access' };
  }

  if (ctx.role === 'reseller') {
    if (ctx.resellerStatus === 'suspended' || !ctx.resellerStatus) {
      await supabase.auth.signOut();
      return { ok: false, code: 'suspended' };
    }
    if (ctx.resellerStatus === 'pending' && supabaseServer) {
      // First sign-in of an invited reseller.
      await supabaseServer
        .from('resellers')
        .update({ status: 'active', password_set_at: new Date().toISOString() })
        .eq('id', ctx.userId)
        .eq('status', 'pending');
    }
  }

  if (supabaseServer && method !== 'link') {
    await supabaseServer
      .from('user_roles')
      .update({ passwordless_at: new Date().toISOString() })
      .eq('user_id', ctx.userId)
      .is('passwordless_at', null);
  }

  if (ctx.role === 'super_admin') return { ok: true, next: ctx.hasTotp ? '/admin/mfa' : '/admin' };
  return { ok: true, next: '/dashboard' };
}

/** Password sign-in stays available only until the super admin has signed in with Google or a code. */
export async function passwordLoginEnabled(): Promise<boolean> {
  if (!supabaseServer) return false;
  const { count } = await supabaseServer
    .from('user_roles')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'super_admin')
    .not('passwordless_at', 'is', null);
  return (count ?? 0) === 0;
}

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export const LOGIN_MESSAGES: Record<string, string> = {
  no_access: "This email doesn't have access to Boostov yet. Ask Boostov to add you.",
  suspended: 'This account is suspended. Contact Boostov.',
  error: 'Sign-in failed. Please try again.',
  expired: 'This sign-in link has expired or was already used.',
  google: 'Google sign-in did not complete. Please try again.',
};
