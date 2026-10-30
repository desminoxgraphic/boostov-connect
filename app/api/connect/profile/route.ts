import { NextResponse } from 'next/server';
import { getConnectBusinessBySlug } from '@/lib/connect-db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Slug parameter missing.' }, { status: 400 });
  }

  try {
    const data = await getConnectBusinessBySlug(slug);
    if (!data || !data.business.is_active) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }

    // The public card never needs the secret stats token or the owner.
    const { dashboard_token: _token, reseller_id: _owner, ...publicBusiness } =
      data.business as typeof data.business & { reseller_id?: string | null };
    return NextResponse.json({ business: publicBusiness, links: data.links });
  } catch (err: unknown) {
    console.error('API Error GET /api/connect/profile:', err);
    return NextResponse.json({ error: 'Failed to fetch profile.' }, { status: 500 });
  }
}
