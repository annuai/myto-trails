-- Profile pictures, club cover images and each rider's bike. Images are rows in media (uploaded through the usual
-- upload pipeline, so they are re-encoded and stripped of location data); these columns only point at them.
-- Closed to the public roles like the rest of the community data: the application reads them through club queries
-- that check membership first.

alter table app_user add column avatar_media_id uuid references media (id) on delete set null;
alter table club add column cover_media_id uuid references media (id) on delete set null;

create table rider_bike (
  user_id uuid primary key references app_user (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  model_year integer check (model_year is null or model_year between 1900 and 2100),
  photo_media_id uuid references media (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table rider_bike enable row level security;
revoke all on rider_bike from anon, authenticated;
