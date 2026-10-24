-- Clubs: riders create clubs, others request to join (with a phone number only the club's admins can read, wiped 7 days
-- after the decision), members share posts and ride plans. Everything is private; nothing is exposed through public views.

create table club (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null unique default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 60),
  description text not null default '' check (char_length(description) <= 500),
  women_only boolean not null default false,
  created_by uuid not null references app_user (id),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create unique index club_name_idx on club (lower(name)) where archived_at is null;

create table club_member (
  club_id uuid not null references club (id) on delete cascade,
  user_id uuid not null references app_user (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index club_member_user_idx on club_member (user_id);

create table club_join_request (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references club (id) on delete cascade,
  user_id uuid not null references app_user (id) on delete cascade,
  message text check (message is null or char_length(message) <= 300),
  phone_ciphertext text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  decided_by uuid references app_user (id),
  decided_at timestamptz,
  phone_delete_at timestamptz,
  check (status = 'pending' or phone_delete_at is not null or phone_ciphertext is null)
);
create unique index club_join_request_one_pending_idx on club_join_request (club_id, user_id) where status = 'pending';

create table club_post (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references club (id) on delete cascade,
  author_id uuid not null references app_user (id) on delete cascade,
  parent_id uuid references club_post (id) on delete cascade,
  kind text not null default 'post' check (kind in ('post', 'ride_plan')),
  body text not null check (char_length(body) between 1 and 1000),
  ride_at timestamptz,
  ride_place text check (ride_place is null or char_length(ride_place) <= 120),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now(),
  check ((kind = 'ride_plan') = (ride_at is not null)),
  check (kind = 'post' or parent_id is null)
);
create index club_post_feed_idx on club_post (club_id, created_at desc);

create table club_ride_response (
  post_id uuid not null references club_post (id) on delete cascade,
  user_id uuid not null references app_user (id) on delete cascade,
  response text not null check (response in ('going', 'maybe')),
  primary key (post_id, user_id)
);

alter table club enable row level security;
alter table club_member enable row level security;
alter table club_join_request enable row level security;
alter table club_post enable row level security;
alter table club_ride_response enable row level security;
revoke all on club, club_member, club_join_request, club_post, club_ride_response from anon, authenticated;
