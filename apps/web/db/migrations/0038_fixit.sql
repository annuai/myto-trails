-- Fix it: repair guides, the pre-ride check and the toolkit, as rows, so they can be edited in the database and read by the app
-- through GET /api/v1/fixit. The first version is loaded once by `npm run fixit:import`; after that the database is the source of
-- truth. Pictures are WebP widths in R2 under public/fixit/<guide>/<slot>-<width>.webp, recorded in fixit_art.variants as
-- { "400": url, "800": url, "1200": url } (the same shape as bike pictures).
-- Closed to the public roles like the other community tables: the application reads them through the API.

create function fixit_touch() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table fixit_tool (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  why text not null check (char_length(why) between 1 and 300),
  kit text not null check (kit in ('base', 'remote')),
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table fixit_guide (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 60),
  title text not null check (char_length(title) between 3 and 80),
  summary text not null check (char_length(summary) between 5 and 200),
  difficulty text not null check (difficulty in ('easy', 'moderate', 'hard')),
  minutes integer not null check (minutes between 1 and 480),
  trailside boolean not null default false,
  hero text check (hero is null or hero ~ '^[a-z0-9]+(-[a-z0-9]+)*/[a-z0-9]+(-[a-z0-9]+)*$'),
  tools text[] not null default '{}',
  -- When to stop and get help instead. At least two lines: every repair has a point where it is not the rider's to fix.
  stop_if text[] not null check (cardinality(stop_if) >= 2),
  -- Who checked the guide and when. Both null until a mechanic has really checked it; never set on someone's behalf.
  reviewed_by text check (reviewed_by is null or char_length(reviewed_by) between 2 and 80),
  reviewed_on date,
  published boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now(),
  check ((reviewed_by is null) = (reviewed_on is null))
);

create table fixit_step (
  guide_id text not null references fixit_guide (id) on delete cascade,
  position integer not null check (position >= 0),
  text text not null check (char_length(text) between 8 and 300),
  warn text check (warn is null or char_length(warn) between 3 and 300),
  expect text check (expect is null or char_length(expect) between 3 and 300),
  art text check (art is null or art ~ '^[a-z0-9]+(-[a-z0-9]+)*/[a-z0-9]+(-[a-z0-9]+)*$'),
  updated_at timestamptz not null default now(),
  primary key (guide_id, position)
);

create table fixit_term (
  guide_id text not null references fixit_guide (id) on delete cascade,
  position integer not null check (position >= 0),
  term text not null check (char_length(term) between 1 and 60),
  meaning text not null check (char_length(meaning) between 3 and 300),
  updated_at timestamptz not null default now(),
  primary key (guide_id, position)
);

create table fixit_check_item (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (char_length(label) between 1 and 60),
  how text not null check (char_length(how) between 5 and 300),
  guides text[] not null default '{}',
  route text check (route is null or route ~ '^/[a-z0-9/_-]*$'),
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table fixit_art (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*/[a-z0-9]+(-[a-z0-9]+)*$'),
  guide_id text not null references fixit_guide (id) on delete cascade,
  alt text not null check (char_length(alt) between 5 and 300),
  variants jsonb not null default '{}'::jsonb check (jsonb_typeof(variants) = 'object'),
  updated_at timestamptz not null default now()
);
create index fixit_art_guide_idx on fixit_art (guide_id);

create trigger fixit_tool_touch before update on fixit_tool for each row execute function fixit_touch();
create trigger fixit_guide_touch before update on fixit_guide for each row execute function fixit_touch();
create trigger fixit_step_touch before update on fixit_step for each row execute function fixit_touch();
create trigger fixit_term_touch before update on fixit_term for each row execute function fixit_touch();
create trigger fixit_check_item_touch before update on fixit_check_item for each row execute function fixit_touch();
create trigger fixit_art_touch before update on fixit_art for each row execute function fixit_touch();

alter table fixit_tool enable row level security;
alter table fixit_guide enable row level security;
alter table fixit_step enable row level security;
alter table fixit_term enable row level security;
alter table fixit_check_item enable row level security;
alter table fixit_art enable row level security;
revoke all on fixit_tool, fixit_guide, fixit_step, fixit_term, fixit_check_item, fixit_art from anon, authenticated;
