-- CARDIFY baseline schema. Safe for a fresh Supabase project.
create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text unique not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_url text,
  cover_image_url text,
  primary_color text not null default '#2563EB' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  google_review_url text not null default '',
  share_url text not null default '',
  share_message text not null default '',
  discount_percentage integer not null default 10 check (discount_percentage between 1 and 100),
  phone text,
  merchant_token text unique not null,
  next_serial integer not null default 1 check (next_serial >= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  serial_number integer not null check (serial_number >= 1),
  customer_name text not null check (char_length(customer_name) between 1 and 100),
  customer_phone text not null check (char_length(customer_phone) between 6 and 40),
  discount_percentage integer not null check (discount_percentage between 1 and 100),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'USED')),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  constraint unique_business_serial unique (business_id, serial_number),
  constraint used_rewards_have_redemption_time check (
    (status = 'ACTIVE' and redeemed_at is null) or (status = 'USED' and redeemed_at is not null)
  )
);

create index if not exists idx_rewards_business_created on public.rewards(business_id, created_at desc);
create index if not exists idx_rewards_business_status on public.rewards(business_id, status);

create or replace function public.prevent_reward_reactivation()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status = 'USED' and new.status <> 'USED' then
    raise exception 'A used reward cannot be reactivated';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_reward_reactivation on public.rewards;
create trigger prevent_reward_reactivation
before update of status on public.rewards
for each row execute function public.prevent_reward_reactivation();

create or replace function public.generate_reward(
  p_business_id uuid,
  p_customer_name text,
  p_customer_phone text
) returns setof public.rewards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
  v_reward public.rewards%rowtype;
begin
  select * into v_business
  from public.businesses
  where id = p_business_id and is_active = true
  for update;

  if not found then
    raise exception 'Business not found or disabled';
  end if;

  insert into public.rewards (
    business_id, serial_number, customer_name, customer_phone, discount_percentage, status
  ) values (
    v_business.id, v_business.next_serial, trim(p_customer_name), trim(p_customer_phone),
    v_business.discount_percentage, 'ACTIVE'
  ) returning * into v_reward;

  update public.businesses
  set next_serial = next_serial + 1, updated_at = now()
  where id = v_business.id;

  return next v_reward;
end;
$$;

alter table public.businesses enable row level security;
alter table public.rewards enable row level security;

-- Assets are public to render customer cards and Connect photo catalogues,
-- but only the service role uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-assets',
  'business-assets',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

drop policy if exists "Public business asset reads" on storage.objects;
create policy "Public business asset reads"
on storage.objects for select
to public
using (bucket_id = 'business-assets');

drop policy if exists "Service role business asset inserts" on storage.objects;
create policy "Service role business asset inserts"
on storage.objects for insert
to service_role
with check (bucket_id = 'business-assets');

drop policy if exists "Service role business asset updates" on storage.objects;
create policy "Service role business asset updates"
on storage.objects for update
to service_role
using (bucket_id = 'business-assets');

drop policy if exists "Service role business asset deletes" on storage.objects;
create policy "Service role business asset deletes"
on storage.objects for delete
to service_role
using (bucket_id = 'business-assets');

revoke all on function public.generate_reward(uuid, text, text) from public, anon, authenticated;
grant execute on function public.generate_reward(uuid, text, text) to service_role;

-- ==========================================
-- BOOSTOV CONNECT SCHEMA (NFC Business Profiles)
-- ==========================================

create table if not exists public.connect_businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text unique not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_url text,
  cover_image_url text,
  description text default '',
  whatsapp_number text default '',
  instagram_handle text default '',
  facebook_url text default '',
  tiktok_handle text default '',
  youtube_url text default '',
  google_maps_url text default '',
  phone text default '',
  website_url text default '',
  gallery_images jsonb not null default '[]'::jsonb,
  gallery_featured_url text default '',
  theme_color text not null default '#2563eb',
  email text not null default '',
  address text not null default '',
  -- Deprecated by 202609270004: the hero copy now lives in `description`, and
  -- the bottom card reads `bottom_tagline` / `bottom_button_text`. Kept so an
  -- existing database loses nothing when the migration runs.
  tagline text not null default '',
  welcome_message text not null default '',
  bottom_tagline text not null default '',
  bottom_button_text text not null default '',
  category text not null default '',
  second_phone text not null default '',
  office_phone text not null default '',
  fax text not null default '',
  dashboard_token text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.connect_businesses add column if not exists facebook_url text default '';
alter table public.connect_businesses add column if not exists tiktok_handle text default '';
alter table public.connect_businesses add column if not exists youtube_url text default '';
alter table public.connect_businesses add column if not exists website_url text default '';
alter table public.connect_businesses add column if not exists gallery_images jsonb not null default '[]'::jsonb;
alter table public.connect_businesses add column if not exists gallery_featured_url text default '';
alter table public.connect_businesses add column if not exists theme_color text not null default '#2563eb';
alter table public.connect_businesses add column if not exists email text not null default '';
alter table public.connect_businesses add column if not exists address text not null default '';
alter table public.connect_businesses add column if not exists tagline text not null default '';
alter table public.connect_businesses add column if not exists welcome_message text not null default '';
alter table public.connect_businesses add column if not exists bottom_tagline text not null default '';
alter table public.connect_businesses add column if not exists bottom_button_text text not null default '';
alter table public.connect_businesses add column if not exists category text not null default '';
alter table public.connect_businesses add column if not exists second_phone text not null default '';
alter table public.connect_businesses add column if not exists office_phone text not null default '';
alter table public.connect_businesses add column if not exists fax text not null default '';

create table if not exists public.connect_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.connect_businesses(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  url text not null,
  icon text not null default 'link',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.connect_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.connect_businesses(id) on delete cascade,
  event_type text not null,
  link_id uuid references public.connect_links(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_connect_events_business_created on public.connect_events(business_id, created_at desc);
create index if not exists idx_connect_events_type on public.connect_events(business_id, event_type);
create index if not exists idx_connect_links_business_order on public.connect_links(business_id, sort_order asc);

alter table public.connect_businesses enable row level security;
alter table public.connect_links enable row level security;
alter table public.connect_events enable row level security;

drop policy if exists "Public active connect business reads" on public.connect_businesses;
create policy "Public active connect business reads"
  on public.connect_businesses for select
  to public
  using (is_active = true);

drop policy if exists "Public active connect link reads" on public.connect_links;
create policy "Public active connect link reads"
  on public.connect_links for select
  to public
  using (is_active = true);

drop policy if exists "Public event insert" on public.connect_events;
create policy "Public event insert"
  on public.connect_events for insert
  to public
  with check (true);



-- ==========================================
-- RESELLER LAYER (mirrors migrations/202610300001_add_reseller_layer.sql)
-- ==========================================

-- Boostov reseller layer (Starter Kit).
--
-- Additive only: new tables, two nullable columns, functions, triggers and
-- RLS policies. No existing column is renamed, retyped or dropped and no
-- existing row is rewritten. Rows that exist today keep reseller_id = null,
-- which means "owned by the super admin".
--
-- The one deliberate removal: the anon SELECT policies on connect_businesses
-- and connect_links. They let anyone holding the public anon key read every
-- active merchant's dashboard_token. Both apps read through the service role,
-- so nothing depends on them.
--
-- Safe to run more than once.


create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Roles and resellers
-- ---------------------------------------------------------------------------

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'reseller')),
  created_at timestamptz not null default now()
);

create table if not exists public.resellers (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  email text not null unique,
  phone text not null default '',
  merchant_limit integer not null default 10 check (merchant_limit >= 0),
  grow_enabled boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  password_set_at timestamptz,
  last_link_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;
alter table public.resellers enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Ownership on the existing merchant tables (null = super admin)
-- ---------------------------------------------------------------------------

alter table public.connect_businesses
  add column if not exists reseller_id uuid references public.resellers(id) on delete restrict;
alter table public.businesses
  add column if not exists reseller_id uuid references public.resellers(id) on delete restrict;

create index if not exists idx_connect_businesses_reseller on public.connect_businesses(reseller_id);
create index if not exists idx_businesses_reseller on public.businesses(reseller_id);

-- Tokens are generated by the database, so a reseller can never choose one.
-- Existing tokens are untouched; this only affects rows inserted without one.
alter table public.connect_businesses
  alter column dashboard_token set default translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
alter table public.businesses
  alter column merchant_token set default translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');

-- ---------------------------------------------------------------------------
-- 3. Global slug registry behind /m/<slug>, and Grow tap log
-- ---------------------------------------------------------------------------

create table if not exists public.merchant_slugs (
  slug text primary key check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  product text not null check (product in ('connect', 'grow')),
  connect_business_id uuid unique references public.connect_businesses(id) on delete cascade,
  grow_business_id uuid unique references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint merchant_slugs_one_target check (
    (product = 'connect' and connect_business_id is not null and grow_business_id is null)
    or (product = 'grow' and grow_business_id is not null and connect_business_id is null)
  )
);

-- The Grow app does not log views, so every /m/<slug> redirect is logged here.
create table if not exists public.merchant_taps (
  id bigint generated always as identity primary key,
  slug text not null references public.merchant_slugs(slug) on delete cascade on update cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_merchant_taps_slug_created on public.merchant_taps(slug, created_at desc);

alter table public.merchant_slugs enable row level security;
alter table public.merchant_taps enable row level security;

-- Backfill: every existing merchant becomes reachable at /m/<slug>.
-- Connect first; a Grow slug that collides is skipped (its old URL is unaffected).
insert into public.merchant_slugs (slug, product, connect_business_id)
select slug, 'connect', id from public.connect_businesses
on conflict do nothing;

insert into public.merchant_slugs (slug, product, grow_business_id)
select slug, 'grow', id from public.businesses
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4. Helper functions
-- ---------------------------------------------------------------------------

-- Super admin only counts once the session passed TOTP (aal2).
create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'super_admin'
  ) and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

-- The caller's reseller id, only while the reseller is active.
create or replace function public.current_reseller_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select r.id
  from public.resellers r
  join public.user_roles u on u.user_id = r.id and u.role = 'reseller'
  where r.id = auth.uid() and r.status = 'active';
$$;

revoke all on function public.is_super_admin() from public;
revoke all on function public.current_reseller_id() from public;
grant execute on function public.is_super_admin() to authenticated, service_role;
grant execute on function public.current_reseller_id() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Rules the database enforces for reseller-owned merchants
-- ---------------------------------------------------------------------------

create or replace function public.enforce_reseller_merchant_rules()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_reseller public.resellers%rowtype;
  v_count integer;
begin
  if new.reseller_id is null then
    return new;
  end if;

  -- Row lock: two parallel creates cannot both pass the limit check.
  select * into v_reseller from public.resellers where id = new.reseller_id for update;
  if not found then
    raise exception 'RESELLER_NOT_FOUND';
  end if;
  if v_reseller.status <> 'active' then
    raise exception 'RESELLER_INACTIVE';
  end if;
  if tg_table_name = 'businesses' and not v_reseller.grow_enabled then
    raise exception 'GROW_NOT_ENABLED';
  end if;

  select
    (select count(*) from public.connect_businesses where reseller_id = v_reseller.id)
    + (select count(*) from public.businesses where reseller_id = v_reseller.id)
  into v_count;

  if v_count >= v_reseller.merchant_limit then
    raise exception 'MERCHANT_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_reseller_merchant_rules on public.connect_businesses;
create trigger enforce_reseller_merchant_rules
before insert on public.connect_businesses
for each row execute function public.enforce_reseller_merchant_rules();

drop trigger if exists enforce_reseller_merchant_rules_move on public.connect_businesses;
create trigger enforce_reseller_merchant_rules_move
before update of reseller_id on public.connect_businesses
for each row when (new.reseller_id is distinct from old.reseller_id)
execute function public.enforce_reseller_merchant_rules();

drop trigger if exists enforce_reseller_merchant_rules on public.businesses;
create trigger enforce_reseller_merchant_rules
before insert on public.businesses
for each row execute function public.enforce_reseller_merchant_rules();

drop trigger if exists enforce_reseller_merchant_rules_move on public.businesses;
create trigger enforce_reseller_merchant_rules_move
before update of reseller_id on public.businesses
for each row when (new.reseller_id is distinct from old.reseller_id)
execute function public.enforce_reseller_merchant_rules();

-- Free-tier storage: reseller merchants carry at most 6 gallery images.
create or replace function public.enforce_reseller_gallery_cap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.reseller_id is not null
     and jsonb_typeof(new.gallery_images) = 'array'
     and jsonb_array_length(new.gallery_images) > 6 then
    raise exception 'GALLERY_LIMIT_REACHED';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_reseller_gallery_cap on public.connect_businesses;
create trigger enforce_reseller_gallery_cap
before insert or update of gallery_images, reseller_id on public.connect_businesses
for each row execute function public.enforce_reseller_gallery_cap();

-- Keep the /m/ registry in sync whichever app creates the merchant.
-- Reseller merchants must get their slug (the insert fails otherwise); merchants
-- created by the existing admin screens or the Grow app never fail because of it.
create or replace function public.register_merchant_slug()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.reseller_id is not null then
      if tg_table_name = 'connect_businesses' then
        insert into public.merchant_slugs (slug, product, connect_business_id) values (new.slug, 'connect', new.id);
      else
        insert into public.merchant_slugs (slug, product, grow_business_id) values (new.slug, 'grow', new.id);
      end if;
    else
      if tg_table_name = 'connect_businesses' then
        insert into public.merchant_slugs (slug, product, connect_business_id) values (new.slug, 'connect', new.id)
        on conflict do nothing;
      else
        insert into public.merchant_slugs (slug, product, grow_business_id) values (new.slug, 'grow', new.id)
        on conflict do nothing;
      end if;
    end if;
  elsif tg_op = 'UPDATE' and new.slug is distinct from old.slug then
    begin
      if tg_table_name = 'connect_businesses' then
        update public.merchant_slugs set slug = new.slug where connect_business_id = new.id;
      else
        update public.merchant_slugs set slug = new.slug where grow_business_id = new.id;
      end if;
    exception when unique_violation then
      null; -- the new slug is taken in the registry; the old /m/ link keeps working
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists register_merchant_slug on public.connect_businesses;
create trigger register_merchant_slug
after insert or update of slug on public.connect_businesses
for each row execute function public.register_merchant_slug();

drop trigger if exists register_merchant_slug on public.businesses;
create trigger register_merchant_slug
after insert or update of slug on public.businesses
for each row execute function public.register_merchant_slug();

-- Rotates a merchant's secret stats token. Owner reseller or super admin only.
create or replace function public.regenerate_stats_token(p_merchant_id uuid, p_product text)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_token text := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_reseller uuid := public.current_reseller_id();
  v_admin boolean := public.is_super_admin();
begin
  if not v_admin and v_reseller is null then
    raise exception 'FORBIDDEN';
  end if;

  if p_product = 'connect' then
    update public.connect_businesses set dashboard_token = v_token, updated_at = now()
    where id = p_merchant_id and (v_admin or reseller_id = v_reseller);
  elsif p_product = 'grow' then
    update public.businesses set merchant_token = v_token, updated_at = now()
    where id = p_merchant_id and (v_admin or reseller_id = v_reseller);
  else
    raise exception 'INVALID_PRODUCT';
  end if;

  if not found then
    raise exception 'NOT_FOUND';
  end if;
  return v_token;
end;
$$;

revoke all on function public.regenerate_stats_token(uuid, text) from public, anon;
grant execute on function public.regenerate_stats_token(uuid, text) to authenticated, service_role;

-- Tap counts per merchant. security invoker: RLS decides which rows count, so a
-- reseller only ever gets numbers for their own merchants.
create or replace function public.merchant_tap_counts()
returns table (product text, merchant_id uuid, total bigint, last_7d bigint)
language sql stable security invoker
set search_path = public
as $$
  select 'connect'::text, e.business_id, count(*),
         count(*) filter (where e.created_at > now() - interval '7 days')
  from public.connect_events e
  where e.event_type = 'view'
  group by e.business_id
  union all
  select 'grow'::text, s.grow_business_id, count(*),
         count(*) filter (where t.created_at > now() - interval '7 days')
  from public.merchant_taps t
  join public.merchant_slugs s on s.slug = t.slug and s.product = 'grow'
  group by s.grow_business_id;
$$;

revoke all on function public.merchant_tap_counts() from public, anon;
grant execute on function public.merchant_tap_counts() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. RLS policies
-- ---------------------------------------------------------------------------

-- Close the dashboard_token leak.
drop policy if exists "Public active connect business reads" on public.connect_businesses;
drop policy if exists "Public active connect link reads" on public.connect_links;

-- user_roles: read own row; writes are service role only.
drop policy if exists "Own role read" on public.user_roles;
create policy "Own role read" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

-- resellers: read own row; only the super admin changes anything.
drop policy if exists "Reseller reads own row" on public.resellers;
create policy "Reseller reads own row" on public.resellers
  for select to authenticated
  using (id = auth.uid() or public.is_super_admin());

drop policy if exists "Super admin manages resellers" on public.resellers;
create policy "Super admin manages resellers" on public.resellers
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- connect_businesses
drop policy if exists "Owner reads connect businesses" on public.connect_businesses;
create policy "Owner reads connect businesses" on public.connect_businesses
  for select to authenticated
  using (reseller_id = public.current_reseller_id() or public.is_super_admin());

drop policy if exists "Owner creates connect businesses" on public.connect_businesses;
create policy "Owner creates connect businesses" on public.connect_businesses
  for insert to authenticated
  with check (reseller_id = public.current_reseller_id() or public.is_super_admin());

drop policy if exists "Owner updates connect businesses" on public.connect_businesses;
create policy "Owner updates connect businesses" on public.connect_businesses
  for update to authenticated
  using (reseller_id = public.current_reseller_id() or public.is_super_admin())
  with check (reseller_id = public.current_reseller_id() or public.is_super_admin());

drop policy if exists "Super admin deletes connect businesses" on public.connect_businesses;
create policy "Super admin deletes connect businesses" on public.connect_businesses
  for delete to authenticated
  using (public.is_super_admin());

-- connect_links
drop policy if exists "Owner reads connect links" on public.connect_links;
create policy "Owner reads connect links" on public.connect_links
  for select to authenticated
  using (
    public.is_super_admin() or exists (
      select 1 from public.connect_businesses b
      where b.id = business_id and b.reseller_id = public.current_reseller_id()
    )
  );

-- connect_events (the existing anon insert policy stays as it is)
drop policy if exists "Owner reads connect events" on public.connect_events;
create policy "Owner reads connect events" on public.connect_events
  for select to authenticated
  using (
    public.is_super_admin() or exists (
      select 1 from public.connect_businesses b
      where b.id = business_id and b.reseller_id = public.current_reseller_id()
    )
  );

-- businesses (Grow)
drop policy if exists "Owner reads grow businesses" on public.businesses;
create policy "Owner reads grow businesses" on public.businesses
  for select to authenticated
  using (reseller_id = public.current_reseller_id() or public.is_super_admin());

drop policy if exists "Owner creates grow businesses" on public.businesses;
create policy "Owner creates grow businesses" on public.businesses
  for insert to authenticated
  with check (reseller_id = public.current_reseller_id() or public.is_super_admin());

drop policy if exists "Owner updates grow businesses" on public.businesses;
create policy "Owner updates grow businesses" on public.businesses
  for update to authenticated
  using (reseller_id = public.current_reseller_id() or public.is_super_admin())
  with check (reseller_id = public.current_reseller_id() or public.is_super_admin());

drop policy if exists "Super admin deletes grow businesses" on public.businesses;
create policy "Super admin deletes grow businesses" on public.businesses
  for delete to authenticated
  using (public.is_super_admin());

-- rewards: read-only for the owner
drop policy if exists "Owner reads rewards" on public.rewards;
create policy "Owner reads rewards" on public.rewards
  for select to authenticated
  using (
    public.is_super_admin() or exists (
      select 1 from public.businesses b
      where b.id = business_id and b.reseller_id = public.current_reseller_id()
    )
  );

-- merchant_slugs / merchant_taps: read for the owner; writes happen in triggers
-- and in the /m/ route through the service role.
drop policy if exists "Owner reads merchant slugs" on public.merchant_slugs;
create policy "Owner reads merchant slugs" on public.merchant_slugs
  for select to authenticated
  using (
    public.is_super_admin()
    or exists (select 1 from public.connect_businesses b
               where b.id = connect_business_id and b.reseller_id = public.current_reseller_id())
    or exists (select 1 from public.businesses b
               where b.id = grow_business_id and b.reseller_id = public.current_reseller_id())
  );

drop policy if exists "Owner reads merchant taps" on public.merchant_taps;
create policy "Owner reads merchant taps" on public.merchant_taps
  for select to authenticated
  using (
    public.is_super_admin() or exists (
      select 1 from public.merchant_slugs s
      join public.businesses b on b.id = s.grow_business_id
      where s.slug = merchant_taps.slug and b.reseller_id = public.current_reseller_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Column grants: what a logged-in user may write at all (RLS decides rows)
-- ---------------------------------------------------------------------------

revoke all on public.user_roles, public.resellers, public.merchant_slugs, public.merchant_taps from anon;
revoke insert, update, delete on public.user_roles, public.merchant_slugs, public.merchant_taps from authenticated;
revoke insert, update, delete on public.resellers from authenticated;
grant select on public.user_roles, public.resellers, public.merchant_slugs, public.merchant_taps to authenticated;

-- Never writable by a reseller: reseller_id (after insert), dashboard_token,
-- merchant_token, slug, created_at, next_serial.
revoke insert, update on public.connect_businesses from authenticated;
grant insert (
  id, reseller_id, name, slug, logo_url, description, category, whatsapp_number,
  instagram_handle, facebook_url, tiktok_handle, google_maps_url, phone, website_url,
  email, address, gallery_images, theme_color, is_active
) on public.connect_businesses to authenticated;
grant update (
  name, logo_url, description, category, whatsapp_number, instagram_handle, facebook_url,
  tiktok_handle, google_maps_url, phone, website_url, email, address, gallery_images,
  theme_color, is_active, updated_at
) on public.connect_businesses to authenticated;

revoke insert, update on public.businesses from authenticated;
grant insert (
  id, reseller_id, name, slug, logo_url, primary_color, google_review_url,
  discount_percentage, phone, is_active
) on public.businesses to authenticated;
grant update (
  name, logo_url, primary_color, google_review_url, discount_percentage, phone,
  is_active, updated_at
) on public.businesses to authenticated;

revoke insert, update, delete on public.connect_links, public.rewards from authenticated;

-- anon keeps exactly one capability: logging profile events.
revoke select, update, delete on public.connect_businesses, public.connect_links,
  public.businesses, public.rewards from anon;


-- Optional admin 2FA (mirrors migrations/202610300002_optional_admin_2fa.sql)

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
