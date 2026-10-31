/**
 * Every absolute link the app hands out (merchant links, stats links, setup
 * links, QR codes) is built here, from NEXT_PUBLIC_APP_URL. Nothing else in the
 * codebase spells out a domain.
 */

function trimSlash(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && configured.trim()) return trimSlash(configured);
  // Vercel always provides the production hostname; used only if the variable
  // was never set on the project.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${trimSlash(vercel)}`;
  return 'http://localhost:3000';
}

/** The separate Grow app (cardify repo). */
export function getGrowAppUrl(): string {
  return trimSlash(process.env.GROW_APP_URL || 'https://cardifyv1.vercel.app');
}

export function merchantPublicUrl(slug: string, base = getAppUrl()): string {
  return `${base}/m/${slug}`;
}

export function connectStatsUrl(token: string, base = getAppUrl()): string {
  return `${base}/connect/dashboard/${token}`;
}

export function growPublicUrl(slug: string, base = getGrowAppUrl()): string {
  return `${base}/s/${slug}`;
}

export function growStatsUrl(token: string, base = getGrowAppUrl()): string {
  return `${base}/m/${token}`;
}

export function authConfirmUrl(tokenHash: string, base = getAppUrl()): string {
  return `${base}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
}

/** Boostov's own WhatsApp, shown to resellers who hit their merchant limit. */
export const BOOSTOV_SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_BOOSTOV_WHATSAPP || '+212709272476';

/** wa.me only accepts digits: no "+", spaces or dashes. A local Moroccan 06/07 number gets 212. */
export function whatsappDigits(phone: string): string {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (/^0[5-7]\d{8}$/.test(digits)) digits = `212${digits.slice(1)}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string, text: string): string {
  return `https://wa.me/${whatsappDigits(phone)}?text=${encodeURIComponent(text)}`;
}
