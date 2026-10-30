-- Moderators act within a country: user_role.region_id is that country. Existing moderators are India's.
update user_role
set region_id = (select id from region where kind = 'country' and iso2 = 'IN')
where role = 'moderator' and region_id is null;

-- "Tell me when Moto Trails opens in my country". One row per email and country; it goes with the account
-- if there is one, and anyone can ask for their row to be removed at the contact address.
create table country_interest (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references region (id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+$' and char_length(email) <= 254),
  user_id uuid references app_user (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (country_id, email)
);
alter table country_interest enable row level security;
revoke all on country_interest from anon, authenticated;
