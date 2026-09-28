-- Run in the Supabase SQL editor after the migration. Everything is rolled back.
begin;
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  r1 public.rewards%rowtype;
  r2 public.rewards%rowtype;
  r3 public.rewards%rowtype;
  changed integer;
begin
  insert into public.businesses (id, name, slug, merchant_token, discount_percentage)
  values
    (a, 'Test Store A', 'test-verification-a', encode(gen_random_bytes(24), 'hex'), 10),
    (b, 'Test Store B', 'test-verification-b', encode(gen_random_bytes(24), 'hex'), 10);

  select * into r1 from public.generate_reward(a, 'Customer One', '+212600000001');
  select * into r2 from public.generate_reward(a, 'Customer Two', '+212600000002');
  select * into r3 from public.generate_reward(b, 'Customer Three', '+212600000003');

  if r1.serial_number <> 1 or r2.serial_number <> 2 or r3.serial_number <> 1 then
    raise exception 'Per-business sequence verification failed';
  end if;

  update public.rewards set status = 'USED', redeemed_at = now()
  where id = r1.id and status = 'ACTIVE';
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'First redemption failed'; end if;

  update public.rewards set status = 'USED', redeemed_at = now()
  where id = r1.id and status = 'ACTIVE';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Double redemption was not blocked'; end if;
end $$;
rollback;
