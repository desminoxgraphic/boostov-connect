-- Migration: Boostov Connect bottom message (single description + bottom content)
--
-- Splits the old overlapping "tagline / welcome_message" pair into the final
-- public card structure:
--
--   * description        - the ONE hero "Business Description" (already existed,
--                          also used by the saved-contact vCard)
--   * bottom_tagline     - one short line above the bottom card
--   * bottom_button_text - the large text inside the themed bottom card
--
-- Existing rows kept their hero blurb in `tagline`, so this migration promotes
-- that text into `description` before `tagline` is reinterpreted as a bottom
-- tagline. Nothing is deleted: `tagline` and `welcome_message` are left in
-- place, unused, so a rollback is always possible.
--
-- Run AFTER 202609270002_add_connect_theming.sql (and after 001 if the gallery
-- is in use). Every statement is idempotent, and the legacy backfill is guarded
-- so the migration still succeeds on a project where 002 has not been applied.

-- ==========================================
-- 1. TABLE COLUMNS
-- ==========================================

alter table public.connect_businesses
  add column if not exists bottom_tagline text not null default '';

alter table public.connect_businesses
  add column if not exists bottom_button_text text not null default '';

-- ==========================================
-- 2. BACKFILL FROM THE LEGACY PAIR
-- ==========================================

do $$
declare
  has_tagline  boolean := false;
  has_welcome  boolean := false;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'connect_businesses'
      and column_name = 'tagline'
  ) into has_tagline;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'connect_businesses'
      and column_name = 'welcome_message'
  ) into has_welcome;

  -- `tagline` did double duty: it was the hero blurb AND the only short line on
  -- the card. Decide both new values from the ORIGINAL row in a single pass so
  -- the same sentence can never end up printed in two places.
  if has_tagline then
    execute $sql$
      with resolved as (
        select
          id,
          -- the hero keeps whatever it displayed before, whichever column held it
          case
            when coalesce(btrim(description), '') <> '' then description
            else coalesce(tagline, '')
          end as new_description,
          -- `tagline` only becomes a bottom tagline when it was not the hero text.
          -- The legacy column allowed 140 characters and could contain line
          -- breaks, so the copy is flattened and clipped to fit the new 80-char
          -- field. The untouched original stays in `tagline`, so nothing is lost.
          case
            when coalesce(btrim(description), '') <> ''
             and coalesce(btrim(tagline), '') <> '' then
              left(
                regexp_replace(btrim(tagline), '[\n\r\t]+', ' ', 'g'),
                80
              )
            else null
          end as new_bottom_tagline
        from public.connect_businesses
      )
      update public.connect_businesses b
      set description = r.new_description,
          bottom_tagline = coalesce(b.bottom_tagline, r.new_bottom_tagline)
      from resolved r
      where b.id = r.id
        and (
          r.new_description is distinct from b.description
          or coalesce(r.new_bottom_tagline, '') is distinct from b.bottom_tagline
        )
    $sql$;
  end if;

  if has_welcome then
    execute $sql$
      -- Same reasoning as above: the legacy column allowed 80 characters, the new
      -- button field allows 60, and the original is still kept in the table.
      update public.connect_businesses
      set bottom_button_text = left(
            regexp_replace(coalesce(btrim(welcome_message), ''), '[\n\r\t]+', ' ', 'g'),
            60
          )
      where coalesce(btrim(welcome_message), '') <> ''
        and coalesce(btrim(bottom_button_text), '') = ''
    $sql$;
  end if;
end $$;

-- New rows must never start out null, whatever the legacy pair contained.
update public.connect_businesses set bottom_tagline = '' where bottom_tagline is null;
update public.connect_businesses set bottom_button_text = '' where bottom_button_text is null;

-- ==========================================
-- 3. CONSTRAINTS
-- ==========================================

-- No length check is added for `description` on purpose. It predates this
-- migration and was never capped in the database, so an existing row may
-- already hold more than the 300 characters the form now allows. Adding the
-- check here would abort the migration and block the business from saving.
-- The 300-character limit is enforced where the data is written instead, by
-- CONNECT_DESCRIPTION_MAX in lib/connect-utils.ts.

-- The two bottom fields are brand new and start out empty, so after the clipped
-- backfill above every existing row already satisfies these. They stop rows
-- written directly through the SQL editor or the dashboard from
-- drifting past what the card can lay out cleanly.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'connect_businesses_bottom_tagline_len'
      and conrelid = 'public.connect_businesses'::regclass
  ) then
    alter table public.connect_businesses
      add constraint connect_businesses_bottom_tagline_len
      check (char_length(coalesce(bottom_tagline, '')) <= 80);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'connect_businesses_bottom_button_text_len'
      and conrelid = 'public.connect_businesses'::regclass
  ) then
    alter table public.connect_businesses
      add constraint connect_businesses_bottom_button_text_len
      check (char_length(coalesce(bottom_button_text, '')) <= 60);
  end if;
end $$;

-- A non-breaking line break would make the "one short line" fields look like
-- two lines on the card, so collapse newlines and tabs at the database level
-- too. This protects rows written through the SQL editor or the dashboard.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'connect_businesses_bottom_single_line'
      and conrelid = 'public.connect_businesses'::regclass
  ) then
    alter table public.connect_businesses
      add constraint connect_businesses_bottom_single_line
      check (
        coalesce(bottom_tagline, '') !~ '[\n\r\t]'
        and coalesce(bottom_button_text, '') !~ '[\n\r\t]'
      );
  end if;
end $$;

-- ==========================================
-- 4. TRIGGER
-- ==========================================

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
