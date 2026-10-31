-- Protect tap/click counts from fake inflation.
--
-- 1. Visitors can no longer write events straight into the database with the
--    public key: every event now goes through /api/connect/events, which
--    de-duplicates and rate-limits per visitor. (The app already writes with
--    the server key, so nothing depends on the old public insert.)
-- 2. Grow taps logged by the /m/<slug> redirect get a hashed visitor id so a
--    repeated visit is not counted again.
-- Additive: no rows are changed.

begin;

drop policy if exists "Public event insert" on public.connect_events;
revoke insert, update, delete on public.connect_events from anon;

alter table public.merchant_taps add column if not exists visitor text;

create index if not exists idx_connect_events_business_created_v
  on public.connect_events (business_id, created_at desc);

commit;
