-- Upgrade an existing CARDIFY database without deleting legitimate records.
alter table public.businesses add column if not exists next_serial integer;
alter table public.businesses add column if not exists cover_image_url text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'businesses' and column_name = 'cover_url'
  ) then
    execute 'update public.businesses set cover_image_url = coalesce(cover_image_url, cover_url)';
  end if;
end $$;

update public.businesses b
set next_serial = greatest(coalesce((
  select max(r.serial_number) + 1 from public.rewards r where r.business_id = b.id
), 1), 1)
where b.next_serial is null;

alter table public.businesses alter column next_serial set default 1;
alter table public.businesses alter column next_serial set not null;

alter table public.rewards drop constraint if exists unique_business_serial;
alter table public.rewards add constraint unique_business_serial unique (business_id, serial_number);

update public.rewards set redeemed_at = null where status = 'ACTIVE';
update public.rewards set redeemed_at = coalesce(redeemed_at, created_at) where status = 'USED';
alter table public.rewards drop constraint if exists used_rewards_have_redemption_time;
alter table public.rewards add constraint used_rewards_have_redemption_time check (
  (status = 'ACTIVE' and redeemed_at is null) or (status = 'USED' and redeemed_at is not null)
);

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
  select * into v_business from public.businesses
  where id = p_business_id and is_active = true for update;
  if not found then raise exception 'Business not found or disabled'; end if;

  insert into public.rewards (
    business_id, serial_number, customer_name, customer_phone, discount_percentage, status
  ) values (
    v_business.id, v_business.next_serial, trim(p_customer_name), trim(p_customer_phone),
    v_business.discount_percentage, 'ACTIVE'
  ) returning * into v_reward;

  update public.businesses set next_serial = next_serial + 1, updated_at = now()
  where id = v_business.id;
  return next v_reward;
end;
$$;

insert into storage.buckets (id, name, public)
values ('business-assets', 'business-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Public business asset reads" on storage.objects;
create policy "Public business asset reads" on storage.objects for select to public
using (bucket_id = 'business-assets');

revoke all on function public.generate_reward(uuid, text, text) from public, anon, authenticated;
grant execute on function public.generate_reward(uuid, text, text) to service_role;
