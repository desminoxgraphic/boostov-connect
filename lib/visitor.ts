import { createHash } from 'crypto';

/**
 * Anonymous, non-reversible visitor id: hash of IP + browser + day + a server
 * secret. Used only to avoid counting the same person twice; the IP itself is
 * never stored.
 */
export function visitorId(headers: Headers): string {
  const ip = (headers.get('x-forwarded-for') || '').split(',')[0].trim() || headers.get('x-real-ip') || 'unknown';
  const ua = headers.get('user-agent') || '';
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY || 'boostov';
  return createHash('sha256').update(`${salt}|${day}|${ip}|${ua}`).digest('base64url').slice(0, 22);
}

/** Minimum minutes between two counted events of the same kind by one visitor. */
export function dedupeWindowMinutes(eventType: string): number {
  return eventType === 'view' ? 30 : 1;
}

/** Hard cap of events one visitor can add to a card per hour. */
export const MAX_EVENTS_PER_VISITOR_HOUR = 40;
