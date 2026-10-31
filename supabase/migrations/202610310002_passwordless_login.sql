-- One login page (Google or email code), invite-only.
-- Additive: one nullable column and one server-only function.

begin;

-- When the person first signed in without a password. Once the super admin has
-- done it, password sign-in is switched off for everyone.
alter table public.user_roles add column if not exists passwordless_at timestamptz;

-- Who may sign in: an existing Auth user that has a role. Server key only.
create or replace function public.invited_access(p_email text)
returns table (user_id uuid, role text, reseller_status text)
language sql stable security definer
set search_path = public, auth
as $$
  select u.id, r.role, rs.status
  from auth.users u
  join public.user_roles r on r.user_id = u.id
  left join public.resellers rs on rs.id = u.id
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.invited_access(text) from public, anon, authenticated;
grant execute on function public.invited_access(text) to service_role;

commit;
