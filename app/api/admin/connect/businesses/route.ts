import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/authz';
import { getAllConnectBusinesses, createConnectBusiness } from '@/lib/connect-db';
import { pickConnectBusinessFields } from '@/lib/connect-utils';
import type { CreateConnectBusinessInput } from '@/lib/connect-types';

export async function GET() {
  const gate = await requireApi('admin');
  if (!gate.ok) return gate.response;

  try {
    const businesses = await getAllConnectBusinesses();
    return NextResponse.json({ businesses });
  } catch (err: unknown) {
    console.error('API Error GET /api/admin/connect/businesses:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireApi('admin');
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const fields = pickConnectBusinessFields(body);

    if (!fields.name || !fields.slug) {
      return NextResponse.json({ error: 'Business name and slug are required.' }, { status: 400 });
    }

    const { business, links: createdLinks } = await createConnectBusiness(
      fields as unknown as CreateConnectBusinessInput
    );

    return NextResponse.json({ business, links: createdLinks });
  } catch (err: unknown) {
    console.error('API Error POST /api/admin/connect/businesses:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
