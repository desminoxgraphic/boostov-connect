import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/authz';

/**
 * Starts a TOTP enrolment for the super admin and returns the QR code.
 * A second device can only be added from a session that already passed TOTP,
 * so a stolen password alone can never register a new authenticator.
 */
export async function POST() {
  const gate = await requireApi('admin-mfa');
  if (!gate.ok) return gate.response;
  const { ctx, supabase } = gate.auth;

  if (ctx.hasTotp && ctx.aal !== 'aal2') {
    return NextResponse.json({ error: 'Verify your current authenticator first.' }, { status: 403 });
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `Boostov admin ${new Date().toISOString().slice(0, 16)}`,
    issuer: 'Boostov',
  });
  if (error || !data) {
    console.error('MFA enroll failed:', error?.message);
    return NextResponse.json(
      { error: 'Could not start 2FA setup. Check that TOTP is enabled in Supabase Auth.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
}
