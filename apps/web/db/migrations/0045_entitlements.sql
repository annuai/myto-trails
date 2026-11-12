-- What a rider has paid for or been given, kept on the server and never trusted from the phone. Group rides read it to decide
-- how many riders they hold. A Large Ride Pass belongs to one ride; Myto Organiser belongs to the rider and has an end date.
-- No payment is taken yet: rows come from 'grant' (founding clubs, support) until a billing provider is wired in, and a
-- provider's own reference is unique so a retried webhook cannot give the same thing twice.
create table entitlement (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  kind text not null check (kind in ('large_ride_pass', 'organiser')),
  ride_id uuid references group_ride(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'failed', 'cancelled', 'refunded')),
  source text not null check (source in ('purchase', 'grant')),
  provider text,
  provider_ref text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (kind <> 'large_ride_pass' or ride_id is not null),
  check (source <> 'purchase' or (provider is not null and provider_ref is not null)),
  unique (provider, provider_ref)
);
create index entitlement_user_idx on entitlement (user_id) where status = 'active';
create index entitlement_ride_idx on entitlement (ride_id) where ride_id is not null;
