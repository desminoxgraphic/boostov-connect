// One-time bootstrap of the super admin account. Run locally, never deployed:
//
//   node scripts/create-super-admin.mjs you@example.com
//
// Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_APP_URL
// from .env.local (or the environment). Creates the Auth user if needed, gives it
// the super_admin role and prints a one-time link to set the password. After
// that, sign in at /admin/login and set up the authenticator app.
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const env = { ...process.env };
  if (existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const i = line.indexOf('=');
      if (i > 0 && !line.startsWith('#') && !env[line.slice(0, i)]) env[line.slice(0, i)] = line.slice(i + 1);
    }
  }
  return env;
}

const email = (process.argv[2] || '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: node scripts/create-super-admin.mjs you@example.com');
  process.exit(1);
}

const env = loadEnv();
const appUrl = (process.argv[3] || env.SUPER_ADMIN_APP_URL || env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !appUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_APP_URL.');
  process.exit(1);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let userId;
const { data: created, error: createError } = await admin.auth.admin.createUser({ email, email_confirm: true });
if (created?.user) {
  userId = created.user.id;
  console.log('Created Auth user.');
} else if (/already|registered|exists/i.test(createError?.message || '')) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id;
  console.log('Auth user already exists.');
}
if (!userId) {
  console.error('Could not create or find the user:', createError?.message);
  process.exit(1);
}

const { data: reseller } = await admin.from('resellers').select('id').eq('id', userId).maybeSingle();
if (reseller) {
  console.error('This email belongs to a reseller. Use a different email for the super admin.');
  process.exit(1);
}

const { error: roleError } = await admin
  .from('user_roles')
  .upsert({ user_id: userId, role: 'super_admin' }, { onConflict: 'user_id' });
if (roleError) {
  console.error('Could not set the role:', roleError.message);
  process.exit(1);
}

const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'recovery', email });
if (linkError || !link?.properties?.hashed_token) {
  console.error('Could not generate the link:', linkError?.message);
  process.exit(1);
}

console.log('\nSuper admin ready. Open this link once to choose your password:\n');
console.log(`${appUrl}/auth/confirm?token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=recovery\n`);
console.log('Then set up your authenticator app on the screen that follows.');
