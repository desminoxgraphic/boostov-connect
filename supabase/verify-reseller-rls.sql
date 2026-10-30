-- Verifies the reseller layer's RLS, grants and triggers.
-- Run AFTER 202610300001_add_reseller_layer.sql. Everything happens inside one
-- transaction that is rolled back, so it leaves no data behind.
-- Any failed check raises an exception; success prints "RESELLER RLS OK".

begin;

-- Fixtures (as the migration owner) -----------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'verify-reseller-a@example.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'verify-reseller-b@example.test'),
  ('00000000-0000-4000-8000-0000000000c3', 'verify-admin@example.test');

insert into public.user_roles (user_id, role) values
  ('00000000-0000-4000-8000-0000000000a1', 'reseller'),
  ('00000000-0000-4000-8000-0000000000b2', 'reseller'),
  ('00000000-0000-4000-8000-0000000000c3', 'super_admin');

insert into public.resellers (id, name, email, merchant_limit, status) values
  ('00000000-0000-4000-8000-0000000000a1', 'Verify A', 'verify-reseller-a@example.test', 2, 'active'),
  ('00000000-0000-4000-8000-0000000000b2', 'Verify B', 'verify-reseller-b@example.test', 10, 'active');

insert into public.connect_businesses (id, name, slug, reseller_id) values
  ('00000000-0000-4000-8000-00000000b001', 'Verify B Shop', 'verify-b-shop-rls', '00000000-0000-4000-8000-0000000000b2');

create temp table verify_result (k text primary key, v text);
grant all on verify_result to anon, authenticated;

-- 1. anon cannot read Connect businesses (the dashboard_token leak) ----------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  perform dashboard_token from public.connect_businesses;
  insert into verify_result values ('anon_connect_rows', 'READABLE');
exception when insufficient_privilege then
  insert into verify_result values ('anon_connect_rows', 'blocked');
end $$;
do $$ begin
  insert into public.connect_events (business_id, event_type)
  select id, 'view' from (values ('00000000-0000-4000-8000-00000000b001'::uuid)) v(id);
  insert into verify_result values ('anon_event_insert', 'ok');
exception when others then
  insert into verify_result values ('anon_event_insert', sqlerrm);
end $$;
reset role;

-- 2. Reseller A: own rows only, limit, Grow flag, grants ---------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal1"}';

insert into verify_result
select 'a_sees_b', count(*)::text from public.connect_businesses where reseller_id = '00000000-0000-4000-8000-0000000000b2';

insert into public.connect_businesses (name, slug, reseller_id)
values ('Verify A One', 'verify-a-one-rls', '00000000-0000-4000-8000-0000000000a1');
insert into public.connect_businesses (name, slug, reseller_id)
values ('Verify A Two', 'verify-a-two-rls', '00000000-0000-4000-8000-0000000000a1');

insert into verify_result
select 'a_own_rows', count(*)::text from public.connect_businesses;

insert into verify_result
select 'a_token_generated', (length(dashboard_token) >= 43)::text
from public.connect_businesses where slug = 'verify-a-one-rls';

insert into verify_result
select 'a_slug_registered', count(*)::text from public.merchant_slugs where slug like 'verify-a-%-rls';

do $$ begin
  insert into public.connect_businesses (name, slug, reseller_id)
  values ('Verify A Three', 'verify-a-three-rls', '00000000-0000-4000-8000-0000000000a1');
  insert into verify_result values ('a_limit', 'NOT ENFORCED');
exception when others then
  insert into verify_result values ('a_limit', sqlerrm);
end $$;

do $$ begin
  insert into public.connect_businesses (name, slug, reseller_id)
  values ('Sneaky', 'verify-sneaky-rls', '00000000-0000-4000-8000-0000000000b2');
  insert into verify_result values ('a_insert_for_b', 'ALLOWED');
exception when others then
  insert into verify_result values ('a_insert_for_b', 'blocked');
end $$;

do $$ begin
  insert into public.businesses (name, slug, reseller_id)
  values ('Verify Grow', 'verify-grow-rls', '00000000-0000-4000-8000-0000000000a1');
  insert into verify_result values ('a_grow', 'ALLOWED');
exception when others then
  insert into verify_result values ('a_grow', sqlerrm);
end $$;

do $$ begin
  update public.resellers set merchant_limit = 999 where id = '00000000-0000-4000-8000-0000000000a1';
  insert into verify_result values ('a_raise_limit', 'ALLOWED');
exception when others then
  insert into verify_result values ('a_raise_limit', 'blocked');
end $$;

do $$ begin
  update public.connect_businesses set dashboard_token = 'chosen' where slug = 'verify-a-one-rls';
  insert into verify_result values ('a_set_token', 'ALLOWED');
exception when others then
  insert into verify_result values ('a_set_token', 'blocked');
end $$;

do $$ begin
  update public.connect_businesses set gallery_images = '["1","2","3","4","5","6","7"]'::jsonb
  where slug = 'verify-a-one-rls';
  insert into verify_result values ('a_gallery_cap', 'NOT ENFORCED');
exception when others then
  insert into verify_result values ('a_gallery_cap', sqlerrm);
end $$;

update public.connect_businesses set name = 'Hacked' where reseller_id = '00000000-0000-4000-8000-0000000000b2';
insert into verify_result values ('a_rotate_own_token',
  (length(public.regenerate_stats_token(
    (select id from public.connect_businesses where slug = 'verify-a-one-rls'), 'connect')) >= 43)::text);

do $$ begin
  perform public.regenerate_stats_token('00000000-0000-4000-8000-00000000b001', 'connect');
  insert into verify_result values ('a_rotate_b_token', 'ALLOWED');
exception when others then
  insert into verify_result values ('a_rotate_b_token', 'blocked');
end $$;

insert into verify_result
select 'a_tap_rows_foreign', count(*)::text from public.merchant_tap_counts()
where merchant_id not in (select id from public.connect_businesses union select id from public.businesses);

reset role;

insert into verify_result
select 'b_name_after_a_update', name from public.connect_businesses where id = '00000000-0000-4000-8000-00000000b001';

-- 3. Suspended reseller sees nothing ------------------------------------------
update public.resellers set status = 'suspended' where id = '00000000-0000-4000-8000-0000000000a1';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal2"}';
insert into verify_result select 'suspended_rows', count(*)::text from public.connect_businesses;
reset role;

-- 4. Super admin needs aal2 ----------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated","aal":"aal1"}';
insert into verify_result select 'admin_no2fa_resellers', (count(*) >= 2)::text from public.resellers;
reset role;
-- Once 2FA is turned on, a password-only session is no longer enough.
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
values ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000000c3', 'verify', 'totp', 'verified', now(), now(), 'JBSWY3DPEHPK3PXP');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated","aal":"aal1"}';
insert into verify_result select 'admin_aal1_resellers', count(*)::text from public.resellers;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated","aal":"aal2"}';
insert into verify_result select 'admin_aal2_resellers', (count(*) >= 2)::text from public.resellers;
reset role;

-- Assertions -------------------------------------------------------------------
do $$
declare
  expected jsonb := jsonb_build_object(
    'anon_connect_rows', 'blocked',
    'anon_event_insert', 'ok',
    'a_sees_b', '0',
    'a_own_rows', '2',
    'a_token_generated', 'true',
    'a_slug_registered', '2',
    'a_limit', 'MERCHANT_LIMIT_REACHED',
    'a_insert_for_b', 'blocked',
    'a_grow', 'GROW_NOT_ENABLED',
    'a_raise_limit', 'blocked',
    'a_set_token', 'blocked',
    'a_gallery_cap', 'GALLERY_LIMIT_REACHED',
    'a_rotate_own_token', 'true',
    'a_rotate_b_token', 'blocked',
    'a_tap_rows_foreign', '0',
    'b_name_after_a_update', 'Verify B Shop',
    'suspended_rows', '0',
    'admin_no2fa_resellers', 'true',
    'admin_aal1_resellers', '0',
    'admin_aal2_resellers', 'true'
  );
  key text;
  got text;
  failures text := '';
begin
  for key in select jsonb_object_keys(expected) loop
    select v into got from verify_result where verify_result.k = key;
    if got is distinct from expected ->> key then
      failures := failures || format(E'\n  %s: expected %s, got %s', key, expected ->> key, coalesce(got, '<missing>'));
    end if;
  end loop;
  if failures <> '' then
    raise exception 'RESELLER RLS FAILED:%', failures;
  end if;
  raise notice 'RESELLER RLS OK (% checks)', (select count(*) from jsonb_object_keys(expected));
end $$;

rollback;
