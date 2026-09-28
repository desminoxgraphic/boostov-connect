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

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('API Error GET /api/connect/profile:', err);
    return NextResponse.json({ error: 'Failed to fetch profile.' }, { status: 500 });
  }
}
