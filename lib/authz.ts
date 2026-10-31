import { NextResponse } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createUserClient } from './supabase/ssr';
import { apiStatusFor, decideAccess, pageRedirectFor, type AccessContext, type Area } from './access';
import { loadAccessContext } from './authz-edge';

export { loadAccessContext };

export interface Authorized {
  ctx: AccessContext;
  /** Acts as the signed-in user; RLS applies. */
  supabase: SupabaseClient;
}

/** For server components and layouts: redirects or 404s unless allowed. */
export async function requirePage(area: Area): Promise<Authorized> {
  const supabase = await createUserClient();
  const ctx = await loadAccessContext(supabase);
  const decision = decideAccess(area, ctx);
  if (decision === 'allow' && ctx) return { ctx, supabase };
  const target = pageRedirectFor(area, decision);
  if (target) redirect(target);
  notFound();
}

/** For route handlers: returns either the caller or a ready 401/403 response. */
export async function requireApi(
  area: Area
): Promise<{ ok: true; auth: Authorized } | { ok: false; response: NextResponse }> {
  const supabase = await createUserClient();
  const ctx = await loadAccessContext(supabase);
  const decision = decideAccess(area, ctx);
  if (decision === 'allow' && ctx) return { ok: true, auth: { ctx, supabase } };
  const status = apiStatusFor(decision);
  return {
    ok: false,
    response: NextResponse.json(
      { error: status === 401 ? 'Unauthorized.' : 'Forbidden.' },
      { status }
    ),
  };
}
