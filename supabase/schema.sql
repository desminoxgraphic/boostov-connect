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


