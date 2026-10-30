import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccessContext, ResellerStatus, Role } from './access';

/**
 * Reads who is calling, using only the caller's own session: the role and
 * reseller rows are read through RLS ("own row" policies). Shared by the
 * middleware and the server.
 */
export async function loadAccessContext(supabase: SupabaseClient): Promise<AccessContext | null> {
  const { data: userData, error } = await supabase.auth.getUser();
  const user = userData?.user;
  if (error || !user) return null;

  const [{ data: roleRow }, { data: aalData }, { data: resellerRow }] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.from('resellers').select('status').eq('id', user.id).maybeSingle(),
  ]);

  return {
    userId: user.id,
    email: user.email || '',
    role: (roleRow?.role as Role | undefined) ?? null,
    aal: aalData?.currentLevel === 'aal2' ? 'aal2' : 'aal1',
    hasTotp: aalData?.nextLevel === 'aal2',
    resellerStatus: (resellerRow?.status as ResellerStatus | undefined) ?? null,
  };
}
