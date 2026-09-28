-- Migration: Add Boostov Connect NFC Business Profiles & Analytics

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
  dashboard_token text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure columns exist if table was previously created
alter table public.connect_businesses add column if not exists facebook_url text default '';
alter table public.connect_businesses add column if not exists tiktok_handle text default '';
alter table public.connect_businesses add column if not exists youtube_url text default '';
alter table public.connect_businesses add column if not exists website_url text default '';

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

-- Public read access for active profiles and active links
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

-- Public insertion for anonymous analytics tracking
drop policy if exists "Public event insert" on public.connect_events;
create policy "Public event insert"
  on public.connect_events for insert
  to public
  with check (true);
