import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { normalizeEmail } from '@/lib/post-login';
import { visitorId } from '@/lib/visitor';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Public "Demander un accès" form. Stored for the admin to approve.
 * Light spam protection: a hidden field bots fill in, and at most 3 requests
 * per visitor per hour.
 */
export async function POST(request: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Demande invalide.' }, { status: 400 });
  }
  if (typeof raw.website === 'string' && raw.website.trim()) return NextResponse.json({ sent: true });

  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 100) : '';
  const email = normalizeEmail(raw.email).slice(0, 200);
  const phone = typeof raw.phone === 'string' ? raw.phone.trim().slice(0, 40) : '';
  const message = typeof raw.message === 'string' ? raw.message.trim().slice(0, 1000) : '';
  if (!name) return NextResponse.json({ error: 'Indiquez votre nom.' }, { status: 400 });
  if (!EMAIL.test(email)) return NextResponse.json({ error: 'Indiquez un e-mail valide.' }, { status: 400 });
  if (!supabaseServer) return NextResponse.json({ error: 'Service indisponible.' }, { status: 503 });

  const visitor = visitorId(request.headers);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseServer
    .from('access_requests')
    .select('id', { count: 'exact', head: true })
    .eq('visitor', visitor)
    .gte('created_at', hourAgo);
  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'Demande déjà envoyée. Nous revenons vers vous rapidement.' }, { status: 429 });
  }

  const { error } = await supabaseServer.from('access_requests').insert({ name, email, phone, message, visitor });
  if (error) return NextResponse.json({ error: 'Envoi impossible. Réessayez.' }, { status: 500 });
  return NextResponse.json({ sent: true });
}
