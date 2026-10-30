-- Rollback for 202610300001_add_reseller_layer.sql. Run manually only.
-- Refuses to run while any reseller still owns a merchant.
-- Deliberately does NOT restore the anon read policies that exposed
-- dashboard_token. Reseller auth users must be removed in Supabase Auth.

begin;

do $$ begin
  if exists (select 1 from public.connect_businesses where reseller_id is not null)
     or exists (select 1 from public.businesses where reseller_id is not null) then
    raise exception 'Resellers still own merchants; reassign or delete them first.';
  end if;
end $$;

drop trigger if exists register_merchant_slug on public.connect_businesses;
drop trigger if exists register_merchant_slug on public.businesses;
drop trigger if exists enforce_reseller_merchant_rules on public.connect_businesses;
drop trigger if exists enforce_reseller_merchant_rules_move on public.connect_businesses;
drop trigger if exists enforce_reseller_merchant_rules on public.businesses;
drop trigger if exists enforce_reseller_merchant_rules_move on public.businesses;
drop trigger if exists enforce_reseller_gallery_cap on public.connect_businesses;

drop policy if exists "Owner reads connect businesses" on public.connect_businesses;
drop policy if exists "Owner creates connect businesses" on public.connect_businesses;
drop policy if exists "Owner updates connect businesses" on public.connect_businesses;
drop policy if exists "Super admin deletes connect businesses" on public.connect_businesses;
drop policy if exists "Owner reads connect links" on public.connect_links;
drop policy if exists "Owner reads connect events" on public.connect_events;
drop policy if exists "Owner reads grow businesses" on public.businesses;
drop policy if exists "Owner creates grow businesses" on public.businesses;
drop policy if exists "Owner updates grow businesses" on public.businesses;
drop policy if exists "Super admin deletes grow businesses" on public.businesses;
drop policy if exists "Owner reads rewards" on public.rewards;

drop function if exists public.merchant_tap_counts();
drop function if exists public.regenerate_stats_token(uuid, text);
drop function if exists public.register_merchant_slug();
drop function if exists public.enforce_reseller_gallery_cap();
drop function if exists public.enforce_reseller_merchant_rules();

drop table if exists public.merchant_taps;
drop table if exists public.merchant_slugs;

alter table public.connect_businesses drop column if exists reseller_id;
alter table public.businesses drop column if exists reseller_id;
alter table public.connect_businesses alter column dashboard_token drop default;
alter table public.businesses alter column merchant_token drop default;

drop function if exists public.current_reseller_id();
drop function if exists public.is_super_admin();
drop table if exists public.resellers;
drop table if exists public.user_roles;

commit;
