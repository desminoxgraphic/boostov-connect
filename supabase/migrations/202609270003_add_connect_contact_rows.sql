-- Migration: Boostov Connect optional contact numbers + business category
--
-- Backs the restructured admin CONTACT section, which now offers a small set of
-- base fields (email / mobile / website) plus optional rows the admin can add:
--   * whatsapp_number - already existed, now surfaced as an optional row
--   * second_phone    - "+ Second mobile"
--   * office_phone    - "+ Office phone"
--   * fax             - "+ Fax"
--   * address         - already existed, now surfaced as an optional row
--
-- Also adds `category`, the short line that sits beside the circular logo on the
-- public card (for example "Beauty Salon").
--
-- Run AFTER 202609270001_add_connect_gallery.sql and
-- 202609270002_add_connect_theming.sql. Every statement is idempotent and no
-- existing row is modified: all four columns default to an empty string, so
-- profiles that never fill them behave exactly as before.

-- ==========================================
-- 1. TABLE COLUMNS
-- ==========================================

alter table public.connect_businesses
  add column if not exists category text not null default '';

alter table public.connect_businesses
  add column if not exists second_phone text not null default '';

alter table public.connect_businesses
  add column if not exists office_phone text not null default '';

alter table public.connect_businesses
  add column if not exists fax text not null default '';

-- ==========================================
-- 2. BACKFILL (defensive: keeps the NOT NULL
--    guarantee true for any row written by an
--    older client or by hand in the dashboard)
-- ==========================================

update public.connect_businesses set category = '' where category is null;
update public.connect_businesses set second_phone = '' where second_phone is null;
update public.connect_businesses set office_phone = '' where office_phone is null;
update public.connect_businesses set fax = '' where fax is null;

-- ==========================================
-- 3. CONSTRAINTS
-- ==========================================

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'connect_businesses_category_len'
  ) then
    alter table public.connect_businesses
      add constraint connect_businesses_category_len
      check (char_length(category) <= 60);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'connect_businesses_phone_len'
  ) then
    alter table public.connect_businesses
      add constraint connect_businesses_phone_len
      check (
        char_length(second_phone) <= 40
        and char_length(office_phone) <= 40
        and char_length(fax) <= 40
      );
  end if;
end $$;
