import { NextResponse } from 'next/server';
import { recordConnectEvent } from '@/lib/connect-db';
import { ConnectEventType } from '@/lib/connect-types';
import { supabaseServer } from '@/lib/supabase/server';
import { MAX_EVENTS_PER_VISITOR_HOUR, dedupeWindowMinutes, visitorId } from '@/lib/visitor';

const VALID_TYPES: ConnectEventType[] = [
  'view',
  'whatsapp',
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'maps',
  'call',
  'email',
  'website',
  'vcard',
  'gallery_open',
  'custom_link',
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Logs a view or click. Each visitor counts once per view (30 min) and once per
 * button (1 min), with a cap per hour, so a script or repeated refreshing cannot
 * inflate a card's numbers. Refused events still answer 200 so nothing breaks
 * on the card.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { business_id, event_type, link_id, metadata } = body ?? {};

    if (typeof business_id !== 'string' || !UUID.test(business_id) || !VALID_TYPES.includes(event_type)) {
      return NextResponse.json({ error: 'Invalid event payload.' }, { status: 400 });
    }
    const linkId = typeof link_id === 'string' && UUID.test(link_id) ? link_id : null;
    const visitor = visitorId(request.headers);

    if (supabaseServer) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabaseServer
        .from('connect_events')
        .select('event_type, link_id, created_at')
        .eq('business_id', business_id)
        .contains('metadata', { v: visitor })
        .gte('created_at', hourAgo)
        .limit(MAX_EVENTS_PER_VISITOR_HOUR + 1);

      const rows = recent ?? [];
      if (rows.length >= MAX_EVENTS_PER_VISITOR_HOUR) {
        return NextResponse.json({ success: true, counted: false });
      }
      const windowStart = Date.now() - dedupeWindowMinutes(event_type) * 60 * 1000;
      const duplicate = rows.some(
        (r) =>
          r.event_type === event_type &&
          (r.link_id ?? null) === linkId &&
          new Date(r.created_at).getTime() >= windowStart
      );
      if (duplicate) return NextResponse.json({ success: true, counted: false });
    }

    const safeMetadata =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : {};
    await recordConnectEvent(business_id, event_type, linkId, { ...safeMetadata, v: visitor });
    return NextResponse.json({ success: true, counted: true });
  } catch (err: unknown) {
    console.error('API Error POST /api/connect/events:', err);
    return NextResponse.json({ error: 'Failed to record event.' }, { status: 500 });
  }
}
