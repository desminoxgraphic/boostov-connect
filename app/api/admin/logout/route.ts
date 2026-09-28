import { NextResponse } from 'next/server';
import { removeAdminCookie } from '@/lib/auth';

export async function POST() {
  removeAdminCookie();
  return NextResponse.json({ success: true });
}
