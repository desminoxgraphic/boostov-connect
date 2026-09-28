-- Migration: Boostov Connect Photo Catalogue / Gallery
--
-- Restores the business photo catalogue:
--   * `gallery_images`      - jsonb array of public storage URLs (already existed)
--   * `gallery_featured_url` - optional cover/featured image pulled out of the array
--   * public-read storage bucket + policies so uploaded files are renderable

-- ==========================================
-- 1. TABLE COLUMNS
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
  dashboard_token text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent patches for pre-existing tables
alter table public.connect_businesses add column if not exists gallery_images jsonb not null default '[]'::jsonb;
alter table public.connect_businesses add column if not exists gallery_featured_url text default '';

-- Also repair `youtube_url`: supabase/schema.sql was missing it, so projects
-- installed from that baseline never got the column the Connect form writes to.
alter table public.connect_businesses add column if not exists youtube_url text default '';

-- Repair rows written before the column existed / with a null value
update public.connect_businesses
set gallery_images = '[]'::jsonb
where gallery_images is null;

update public.connect_businesses
set gallery_featured_url = ''
where gallery_featured_url is null;

-- Drop a featured image that no longer exists in the gallery array
update public.connect_businesses b
set gallery_featured_url = ''
where b.gallery_featured_url <> ''
  and not exists (
    select 1
    from jsonb_array_elements_text(coalesce(b.gallery_images, '[]'::jsonb)) as image(url)
    where image.url = b.gallery_featured_url
  );

-- ==========================================
-- 2. STORAGE BUCKET
-- ==========================================

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

-- Public reads so the NFC page can render photos for anonymous visitors.
-- Writes stay restricted to the service role used by the admin API routes.
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
