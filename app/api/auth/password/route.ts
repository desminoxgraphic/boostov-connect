import { NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/ssr';
import { loadAccessContext } from '@/lib/authz';
import { validatePassword } from '@/lib/reseller-validation';

/** Signed-in user (admin or reseller) changes their own password. */
export async function POST(request: Request) {
  let password = '';
  try {
    password = String((await request.json())?.password ?? '');
  } catch {
    /* handled below */
  }
  const problem = validatePassword(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const supabase = await createUserClient();
  const ctx = await loadAccessContext(supabase);
  if (!ctx?.role) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const reused = /different from the old/i.test(error.message);
    return NextResponse.json(
      { error: reused ? 'Choisissez un mot de passe différent de l’ancien.' : 'Impossible d’enregistrer le mot de passe.' },
      { status: 400 }
    );
  }
  return NextResponse.json({ saved: true });
}
