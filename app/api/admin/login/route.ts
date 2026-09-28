import { NextResponse } from 'next/server';
import { setAdminCookie } from '@/lib/auth';
import { getAdminAuthDiagnostic, isAdminAuthConfigured, verifyAdminPassword } from '@/lib/session';

export async function POST(request: Request) {
  try {
    let password: unknown;
    try {
      const body = await request.json();
      password = body?.password;
    } catch {
      return NextResponse.json({ success: false, error: 'Login failed.' }, { status: 500 });
    }

    if (!isAdminAuthConfigured()) {
      console.error('Admin login rejected (503): auth not configured.', {
        diagnostic: getAdminAuthDiagnostic(),
      });
      return NextResponse.json(
        {
          success: false,
          error:
            'Admin authentication is not configured. Set a strong ADMIN_PASSWORD (12+ characters) and AUTH_SECRET (32+ characters).',
        },
        { status: 503 }
      );
    }

    if (typeof password !== 'string' || !(await verifyAdminPassword(password))) {
      return NextResponse.json({ success: false, error: 'Invalid admin password.' }, { status: 401 });
    }

    if (!(await setAdminCookie())) {
      return NextResponse.json(
        { success: false, error: 'Admin authentication is not configured.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin login failed (500):', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error).slice(0, 500),
    });
    return NextResponse.json({ success: false, error: 'Login failed.' }, { status: 500 });
  }
}