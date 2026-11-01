-- Ride events: a dated ride a rider or a club announces. Riders reply (going, maybe, can't make it), check in by being
-- at the meeting point, and the host starts it as a group ride. Privacy: a decline note is read by the host only, and a
-- members-only event is never visible to anyone outside the club. Nothing here stores a position; check-in tests one.

create table ride_event (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null unique default gen_random_uuid(),
  host_id uuid not null references app_user (id) on delete cascade,
  club_id uuid references club (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text not null default '' check (char_length(description) <= 500),
  starts_at timestamptz not null,
  time_zone text not null default 'Asia/Kolkata',
  place_name text not null check (char_length(place_name) between 1 and 120),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  radius_m integer not null default 150 check (radius_m between 100 and 500),
  audience text not null default 'open' check (audience in ('open', 'members')),
  capacity integer check (capacity is null or capacity between 2 and 200),
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended', 'cancelled')),
  group_ride_id uuid references group_ride (id) on delete set null,
  created_at timestamptz not null default now(),
  check (audience = 'open' or club_id is not null)
);
create index ride_event_discover on ride_event (starts_at) where audience = 'open' and status in ('scheduled', 'live');
create index ride_event_club on ride_event (club_id, starts_at);
create index ride_event_host on ride_event (host_id, starts_at);

create table ride_event_rsvp (
  event_id uuid not null references ride_event (id) on delete cascade,
  user_id uuid not null references app_user (id) on delete cascade,
  response text not null check (response in ('going', 'maybe', 'declined', 'waitlisted')),
  reason text check (reason in ('work', 'bike', 'distance', 'other')),
  note text check (note is null or char_length(note) <= 200),
  checked_in_at timestamptz,
  role text check (role in ('captain', 'marshal', 'medic', 'sweep')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index ride_event_rsvp_user on ride_event_rsvp (user_id);

alter table group_ride add column event_id uuid references ride_event (id) on delete set null;
alter table group_ride add column stretch_km integer not null default 3 check (stretch_km between 1 and 10);
alter table group_ride_member add column event_role text check (event_role in ('captain', 'marshal', 'medic', 'sweep'));

alter table ride_event enable row level security;
alter table ride_event_rsvp enable row level security;
revoke all on ride_event, ride_event_rsvp from anon, authenticated;
