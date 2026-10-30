// Emergency: removes every 2FA device of the super admin (lost phone).
// Run locally with the service role key in .env.local:
//
//   node scripts/reset-admin-mfa.mjs you@example.com
//
// After this, the next sign-in at /admin/login asks to set up a new authenticator.
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = { ...process.env };
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0 && !line.startsWith('#') && !env[line.slice(0, i)]) env[line.slice(0, i)] = line.slice(i + 1);
  }
}

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: node scripts/reset-admin-mfa.mjs you@example.com');
  process.exit(1);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
const user = list?.users.find((u) => u.email?.toLowerCase() === email);
if (!user) {
  console.error('No user with that email.');
  process.exit(1);
}
const { data: role } = await admin.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
if (role?.role !== 'super_admin') {
  console.error('That user is not the super admin.');
  process.exit(1);
}

const { data: factors, error } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
if (error) {
  console.error('Could not list factors:', error.message);
  process.exit(1);
}
for (const factor of factors?.factors ?? []) {
  await admin.auth.admin.mfa.deleteFactor({ userId: user.id, id: factor.id });
  console.log(`Removed ${factor.friendly_name || factor.id}`);
}
console.log('Done. 2FA is off; sign in at /admin/login with email + password. You can turn 2FA on again under Security.');
