-- Ride companion: check-ins ("tell someone if I haven't arrived"), group rides, rider condition reports and shared routes.
-- All private to the owner connection: row-level security is on, there are no policies and no grants for anon/authenticated.
-- Everything a rider owns goes with their account (on delete cascade). Positions are wiped when a ride ends or expires.

-- A check-in: the rider names who to tell and when they expect to arrive. The contact opens /track/<token>; only the hash
-- of the token is stored. Position and emergency details are wiped 24 hours after the check-in ends.
create table ride_checkin (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  token_hash text not null unique,
  ride_name text check (ride_name is null or char_length(ride_name) <= 60),
  contact_name text not null check (char_length(contact_name) between 1 and 60),
  contact_email text check (contact_email is null or (char_length(contact_email) <= 254 and contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+$')),
  share_live boolean not null default false,
  started_at timestamptz not null default now(),
  expected_at timestamptz not null,
  arrived_at timestamptz,
  overdue_notified_at timestamptz,
  last_lat double precision check (last_lat is null or last_lat between -90 and 90),
  last_lng double precision check (last_lng is null or last_lng between -180 and 180),
  last_ping_at timestamptz,
  battery_pct smallint check (battery_pct is null or battery_pct between 0 and 100),
  emergency jsonb,
  wiped_at timestamptz
);
create index ride_checkin_user_idx on ride_checkin (user_id, started_at desc);
create index ride_checkin_due_idx on ride_checkin (expected_at) where arrived_at is null and wiped_at is null;

-- A group ride: a leader, a join code, and the riders' last positions while the ride is on.
create table group_ride (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[A-HJKMNP-Z2-9]{6}$'),
  name text not null check (char_length(name) between 1 and 60),
  leader_id uuid not null references app_user (id) on delete cascade,
  club_id uuid references club (id) on delete set null,
  regroup_lat double precision check (regroup_lat is null or regroup_lat between -90 and 90),
  regroup_lng double precision check (regroup_lng is null or regroup_lng between -180 and 180),
  regroup_note text check (regroup_note is null or char_length(regroup_note) <= 120),
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index group_ride_open_code_idx on group_ride (code) where ended_at is null;
create index group_ride_leader_idx on group_ride (leader_id);

create table group_ride_member (
  ride_id uuid not null references group_ride (id) on delete cascade,
  user_id uuid not null references app_user (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  role text not null default 'member' check (role in ('leader', 'member')),
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  seen_at timestamptz,
  status text not null default 'ok' check (status in ('ok', 'wait_up', 'fuel', 'break', 'help')),
  last_write_at timestamptz,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (ride_id, user_id)
);
create index group_ride_member_user_idx on group_ride_member (user_id);

-- What a rider saw on a trail. It is evidence with a date, shown as "reported by a rider"; it never edits the trail's
-- published access or condition (those change only through moderators). `client_id` makes a retried upload harmless.
create table condition_report (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references trail (id) on delete cascade,
  user_id uuid not null references app_user (id) on delete cascade,
  client_id text not null check (char_length(client_id) between 8 and 64),
  kind text not null check (kind in ('clear', 'muddy', 'blocked', 'washed_out', 'closed')),
  note text check (note is null or char_length(note) <= 300),
  reported_at timestamptz not null,
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  media_id uuid references media (id) on delete set null,
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index condition_report_trail_idx on condition_report (trail_id, reported_at desc) where status = 'visible';

create table condition_report_vote (
  report_id uuid not null references condition_report (id) on delete cascade,
  user_id uuid not null references app_user (id) on delete cascade,
  still boolean not null,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

-- A route a rider chose to share: the phone has already trimmed the start and end; the server keeps what it was given.
create table shared_route (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique check (public_id ~ '^[a-z2-9]{10}$'),
  owner_id uuid not null references app_user (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  points jsonb not null,
  waypoints jsonb not null default '[]',
  distance_km numeric(8, 1) not null check (distance_km >= 0),
  elevation_gain_m integer check (elevation_gain_m is null or elevation_gain_m >= 0),
  created_at timestamptz not null default now()
);
create index shared_route_owner_idx on shared_route (owner_id, created_at desc);

alter table ride_checkin enable row level security;
alter table group_ride enable row level security;
alter table group_ride_member enable row level security;
alter table condition_report enable row level security;
alter table condition_report_vote enable row level security;
alter table shared_route enable row level security;
revoke all on ride_checkin, group_ride, group_ride_member, condition_report, condition_report_vote, shared_route from anon, authenticated;
