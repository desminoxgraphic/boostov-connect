import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function isRealSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname.endsWith('.supabase.co')
      && !url.hostname.includes('your-project');
  } catch {
    return false;
  }
}

function isRealServiceRoleKey(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return value.trim().length >= 32
    && !normalized.includes('your-supabase')
    && !normalized.includes('placeholder');
}

export const isSupabaseConfigured = isRealSupabaseUrl(supabaseUrl)
  && isRealServiceRoleKey(serviceRoleKey);

export const supabaseServer = isSupabaseConfigured
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      },
    })
  : null;
