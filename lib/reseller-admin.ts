import type { SupabaseClient } from '@supabase/supabase-js';
import { authConfirmUrl, buildWhatsAppUrl } from './app-url';

export type LinkKind = 'setup' | 'reset';

/** The WhatsApp message sent to a reseller with their link. Edit wording here. */
export function resellerLinkMessage(name: string, kind: LinkKind, link: string): string {
  const first = name.split(/\s+/)[0] || name;
  return kind === 'setup'
    ? `Bonjour ${first}, bienvenue chez Boostov ! Voici votre lien pour créer votre mot de passe et accéder à votre espace revendeur :\n${link}\n\nLe lien ne fonctionne qu'une seule fois.`
    : `Bonjour ${first}, voici votre lien pour choisir un nouveau mot de passe Boostov :\n${link}\n\nLe lien ne fonctionne qu'une seule fois.`;
}

/**
 * Generates a one-time recovery link without Supabase sending any email, then
 * wraps its hashed token in our own /auth/confirm URL.
 */
export async function generateResellerLink(
  service: SupabaseClient,
  reseller: { id: string; name: string; email: string; phone: string; password_set_at: string | null }
): Promise<{ kind: LinkKind; link: string; whatsapp_url: string } | { error: string }> {
  const { data, error } = await service.auth.admin.generateLink({ type: 'recovery', email: reseller.email });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) {
    console.error('generateLink failed:', error?.message);
    return { error: 'Could not generate the link. Try again.' };
  }
  const kind: LinkKind = reseller.password_set_at ? 'reset' : 'setup';
  const link = authConfirmUrl(hashed);
  await service
    .from('resellers')
    .update({ last_link_generated_at: new Date().toISOString() })
    .eq('id', reseller.id);
  return {
    kind,
    link,
    whatsapp_url: buildWhatsAppUrl(reseller.phone, resellerLinkMessage(reseller.name, kind, link)),
  };
}

/** About 100 years: Supabase's way of saying "banned until unbanned". */
export const SUSPEND_BAN_DURATION = '876000h';
