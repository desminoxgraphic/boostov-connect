import { NextResponse } from 'next/server';
import {
  getConnectBusinessByDashboardToken,
  getConnectAnalyticsSummary,
} from '@/lib/connect-db';

export async function GET(_request: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const data = await getConnectBusinessByDashboardToken(params.token);
    if (!data) {
      return NextResponse.json({ error: 'Invalid dashboard token or profile not found.' }, { status: 404 });
    }

    const summary = await getConnectAnalyticsSummary(data.business, data.links);

    return NextResponse.json({
      business: data.business,
      links: data.links,
      summary,
    });
  } catch (err: unknown) {
    console.error('API Error GET /api/connect/dashboard/[token]:', err);
    return NextResponse.json({ error: 'Failed to load merchant analytics.' }, { status: 500 });
  }
}
