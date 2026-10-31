-- "Demander un accès" form on the public home page.
-- Requests are written and read only by the server (service role); the admin
-- approves them from the panel. Additive.

begin;

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 200),
  phone text not null default '',
  message text not null default '' check (char_length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  visitor text,
  created_at timestamptz not null default now()
);

create index if not exists idx_access_requests_status_created on public.access_requests (status, created_at desc);

alter table public.access_requests enable row level security;
revoke all on public.access_requests from anon, authenticated;

commit;
