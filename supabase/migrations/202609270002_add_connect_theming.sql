-- Migration: Boostov Connect public card theming + contact details
--
-- Adds the admin-customisable presentation layer for the public Connect card:
--   * theme_color      - brand colour that drives the whole public card theme
--   * email            - CONTACT section row
--   * address          - CONTACT section row (physical address)
--   * tagline          - short business line under the name ("Beauty, cosmetics...")
--   * welcome_message  - soft themed bottom button ("Welcome anytime!")
--
-- Run AFTER 202609270001_add_connect_gallery.sql. Every statement is idempotent.

-- ==========================================
-- 1. TABLE COLUMNS
-- ==========================================

alter table public.connect_businesses
  add column if not exists theme_color text not null default '#2563eb';

alter table public.connect_businesses
  add column if not exists email text not null default '';

alter table public.connect_businesses
  add column if not exists address text not null default '';

alter table public.connect_businesses
  add column if not exists tagline text not null default '';

alter table public.connect_businesses
  add column if not exists welcome_message text not null default '';

-- ==========================================
-- 2. BACKFILL
-- ==========================================

update public.connect_businesses set theme_color = '#2563eb' where theme_color is null or btrim(theme_color) = '';
update public.connect_businesses set email = '' where email is null;
update public.connect_businesses set address = '' where address is null;
update public.connect_businesses set tagline = '' where tagline is null;
update public.connect_businesses set welcome_message = '' where welcome_message is null;

-- ==========================================
-- 3. CONSTRAINTS
-- ==========================================

-- Only real 6-digit hex values are storable, so the renderer never has to
-- defend itself against a bad colour that reached the database by some
-- other route (SQL editor, dashboard, future API).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'connect_businesses_theme_color_hex'
  ) then
    alter table public.connect_businesses
      add constraint connect_businesses_theme_color_hex
      check (theme_color ~ '^#[0-9a-fA-F]{6}$');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'connect_businesses_tagline_len'
  ) then
    alter table public.connect_businesses
      add constraint connect_businesses_tagline_len
      check (char_length(tagline) <= 140);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'connect_businesses_welcome_len'
  ) then
    alter table public.connect_businesses
      add constraint connect_businesses_welcome_len
      check (char_length(welcome_message) <= 80);
  end if;
end $$;

-- Keep updated_at honest for these writes too.
create or replace function public.touch_connect_businesses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists connect_businesses_touch_updated_at on public.connect_businesses;
create trigger connect_businesses_touch_updated_at
  before update on public.connect_businesses
  for each row
  execute function public.touch_connect_businesses_updated_at();
