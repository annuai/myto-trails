-- The bike catalogue riders pick their bike from. Makes and models are rows (so the list is editable in the database
-- and by `npm run bikes:import`); the picture of a model is a set of WebP widths in R2, recorded in image_variants as
-- { "400": url, "800": url, "1200": url }. A model without an image is hidden from the picker by default.
-- Closed to the public roles like the other community tables: the application reads them through the API.

create table bike_make (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 60),
  active boolean not null default true
);

create table bike_model (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  make_id uuid not null references bike_make (id),
  model text not null check (char_length(model) between 1 and 80),
  variant text check (variant is null or char_length(variant) between 1 and 80),
  category text not null check (category in ('commuter', 'retro', 'cruiser', 'adventure', 'scrambler', 'naked', 'sport', 'touring', 'offroad', 'scooter', 'electric')),
  engine_cc integer check (engine_cc is null or engine_cc between 1 and 5000),
  year_from integer check (year_from is null or year_from between 1900 and 2100),
  year_to integer check (year_to is null or year_to between 1900 and 2100),
  image_variants jsonb not null default '{}'::jsonb check (jsonb_typeof(image_variants) = 'object'),
  image_updated_at timestamptz,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  check (year_from is null or year_to is null or year_to >= year_from)
);
create index bike_model_make_idx on bike_model (make_id);

alter table rider_bike add column bike_model_id uuid references bike_model (id) on delete set null;

alter table bike_make enable row level security;
alter table bike_model enable row level security;
revoke all on bike_make, bike_model from anon, authenticated;
