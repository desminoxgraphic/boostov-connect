import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getConnectCapabilities } from '@/lib/connect-db';
import { CONNECT_GALLERY_MAX_IMAGES } from '@/lib/connect-utils';

/**
 * Tells the admin forms which Connect features the database actually supports.
 *
 * The featured-photo and theming columns are added by
 * supabase/migrations/202609270001_add_connect_gallery.sql and
 * supabase/migrations/202609270002_add_connect_theming.sql. Until they have been
 * run those columns do not exist, so the related controls are hidden rather than
 * silently discarding the admin's input.
 *
 * The route keeps its original path so existing callers do not break.
 */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json({
      capabilities: await getConnectCapabilities(),
      max_images: CONNECT_GALLERY_MAX_IMAGES,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
