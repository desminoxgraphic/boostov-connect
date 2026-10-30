import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/authz';
import { supabaseServer } from '@/lib/supabase/server';
import { ASSETS_BUCKET } from '@/lib/reseller-merchants';
import { MAX_UPLOAD_BYTES, UPLOAD_MIME_TYPES } from '@/lib/reseller-validation';

const EXTENSIONS: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Uploads one already-compressed image into the reseller's own folder:
 * resellers/<reseller_id>/<merchant_id>/... A reseller can never write
 * outside their folder, whatever merchant id they send.
 */
export async function POST(request: Request) {
  const gate = await requireApi('reseller');
  if (!gate.ok) return gate.response;
  if (!supabaseServer) return NextResponse.json({ error: 'Storage is not configured.' }, { status: 503 });

  const form = await request.formData();
  const file = form.get('file');
  const merchantId = form.get('merchant_id');
  const kind = form.get('kind') === 'gallery' ? 'gallery' : 'logo';

  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image.' }, { status: 400 });
  if (typeof merchantId !== 'string' || !UUID.test(merchantId)) {
    return NextResponse.json({ error: 'Invalid merchant.' }, { status: 400 });
  }
  if (!(UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: 'Use a JPG, PNG or WEBP image.' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'This image is too large even after compression.' }, { status: 413 });
  }

  const path = `resellers/${gate.auth.ctx.userId}/${merchantId}/${kind}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}.${EXTENSIONS[file.type]}`;

  const { error } = await supabaseServer.storage
    .from(ASSETS_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (error) {
    console.error('Reseller upload failed:', error.message);
    return NextResponse.json({ error: 'Upload failed. Try again.' }, { status: 500 });
  }

  const { data } = supabaseServer.storage.from(ASSETS_BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
