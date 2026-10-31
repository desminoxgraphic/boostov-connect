import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { requireApi } from '@/lib/authz';
import { merchantPublicUrl } from '@/lib/app-url';
import { loadOwnedMerchant } from '@/lib/reseller-merchants';

/** Downloadable PNG QR code of the merchant's public link. */
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireApi('reseller');
  if (!gate.ok) return gate.response;

  const merchant = await loadOwnedMerchant(gate.auth.supabase, params.id);
  if (!merchant) return NextResponse.json({ error: 'Merchant not found.' }, { status: 404 });

  const png = await QRCode.toBuffer(merchantPublicUrl(merchant.slug), {
    type: 'png',
    width: 1024,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="qr-${merchant.slug}.png"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
