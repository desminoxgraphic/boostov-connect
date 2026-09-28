import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const BUSINESS_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  if (!supabaseServer) {
    return NextResponse.json(
      { error: 'Database storage is not configured. Check SUPABASE_SERVICE_ROLE_KEY environment variable.' },
      { status: 503 }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    const rawKind = form.get('kind');
    const kind = rawKind === 'cover' ? 'cover' : rawKind === 'gallery' ? 'gallery' : 'logo';
    const businessId = form.get('business_id');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Choose an image file to upload.' }, { status: 400 });
    }

    if (typeof businessId !== 'string' || !BUSINESS_ID_PATTERN.test(businessId)) {
      return NextResponse.json({ error: 'A valid business UUID is required for upload.' }, { status: 400 });
    }

    const extension = MIME_EXTENSIONS[file.type];
    if (!extension) {
      return NextResponse.json({ error: `Unsupported image type (${file.type}). Use PNG, JPG, WEBP, or GIF.` }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be 10 MB or smaller.' }, { status: 400 });
    }

    const bucket = 'business-assets';

    // Ensure bucket exists or handle missing bucket gracefully
    const path = `businesses/${businessId}/${kind}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${extension}`;
    const { data: uploadData, error } = await supabaseServer.storage
      .from(bucket)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Supabase Storage Upload Error:', error);
      return NextResponse.json(
        { error: `Storage Upload Failed: ${error.message} (${(error as any).statusCode || 'ERR'})` },
        { status: 500 }
      );
    }

    const { data } = supabaseServer.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path: uploadData.path });
  } catch (error: any) {
    console.error('Asset upload exception:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Asset upload failed: ${msg}` }, { status: 500 });
  }
}
