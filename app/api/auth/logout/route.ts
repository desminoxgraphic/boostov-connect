import { NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/ssr';

export async function POST() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
