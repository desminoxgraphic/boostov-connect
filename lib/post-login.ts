import type { SupabaseClient } from '@supabase/supabase-js';
import { loadAccessContext } from './authz-edge';
import { supabaseServer } from './supabase/server';

export type PostLoginResult =
  | { ok: true; next: string }
  | { ok: false; code: 'no_access' | 'suspended' | 'error' };

/**
 * Runs right after a successful sign-in (password or emergency link).
 * Decides where the person goes and turns away anyone without a role.
 */
export async function afterSignIn(supabase: SupabaseClient): Promise<PostLoginResult> {
  const ctx = await loadAccessContext(supabase);
  if (!ctx) return { ok: false, code: 'error' };

  if (!ctx.role) {
    await supabase.auth.signOut();
    return { ok: false, code: 'no_access' };
  }

  if (ctx.role === 'reseller') {
    if (ctx.resellerStatus === 'suspended' || !ctx.resellerStatus) {
      await supabase.auth.signOut();
      return { ok: false, code: 'suspended' };
    }
    if (ctx.resellerStatus === 'pending' && supabaseServer) {
      await supabaseServer
        .from('resellers')
        .update({ status: 'active', password_set_at: new Date().toISOString() })
        .eq('id', ctx.userId)
        .eq('status', 'pending');
    }
  }

  if (ctx.role === 'super_admin') return { ok: true, next: ctx.hasTotp ? '/admin/mfa' : '/admin' };
  return { ok: true, next: '/dashboard' };
}

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export const LOGIN_MESSAGES: Record<string, string> = {
  no_access: "Ce compte n'a pas accès à Boostov. Demandez un accès.",
  suspended: 'Ce compte est suspendu. Contactez Boostov.',
  error: 'La connexion a échoué. Réessayez.',
  expired: 'Ce lien a expiré ou a déjà été utilisé.',
  invalid: 'E-mail ou mot de passe incorrect.',
};
