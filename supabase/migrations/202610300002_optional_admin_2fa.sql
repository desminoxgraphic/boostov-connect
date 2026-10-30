-- 2FA for the super admin becomes optional.
-- Without a verified TOTP factor, a password session (aal1) is enough.
-- Once the super admin turns 2FA on, every session must pass it (aal2).

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'super_admin'
  ) and (
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (
      select 1 from auth.mfa_factors
      where user_id = auth.uid() and status = 'verified'
    )
  );
$$;
