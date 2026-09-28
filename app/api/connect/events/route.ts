import { NextResponse } from 'next/server';
import { recordConnectEvent } from '@/lib/connect-db';
import { ConnectEventType } from '@/lib/connect-types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { business_id, event_type, link_id, metadata } = body;

    const validTypes: ConnectEventType[] = [
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

    if (!business_id || !validTypes.includes(event_type)) {
      return NextResponse.json({ error: 'Invalid event payload.' }, { status: 400 });
    }

    const event = await recordConnectEvent(business_id, event_type, link_id, metadata);

    return NextResponse.json({ success: true, event });
  } catch (err: unknown) {
    console.error('API Error POST /api/connect/events:', err);
    return NextResponse.json({ error: 'Failed to record event.' }, { status: 500 });
  }
}
