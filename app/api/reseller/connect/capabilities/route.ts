import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/authz';
import { getConnectCapabilities } from '@/lib/connect-db';
import { RESELLER_MAX_GALLERY } from '@/lib/connect-form-config';

/** Same answer as the admin capabilities route, for the reseller form. */
export async function GET() {
  const gate = await requireApi('reseller');
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ capabilities: await getConnectCapabilities(), max_images: RESELLER_MAX_GALLERY });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
