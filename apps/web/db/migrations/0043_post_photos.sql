-- Photos on club posts, reactions, and albums for ride events (docs/photo-posts.md).
-- A photo is an `asset`: three JPEGs in the public bucket (thumb 400, view 1080, full 2048 pixels) made on the rider's phone. `stem` is
-- the object name without the size and extension: `post/<owner id>/<asset id>`.
create table asset (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references app_user (id) on delete cascade,
  kind text not null default 'image' check (kind = 'image'),
  stem text not null unique check (stem ~ '^post/[0-9a-f-]{36}/[0-9a-f-]{36}$'),
  width integer not null check (width between 1 and 8000),
  height integer not null check (height between 1 and 8000),
  bytes integer not null check (bytes > 0),
  -- The picture's main colour, shown while the thumbnail loads.
  colour text check (colour is null or colour ~ '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now()
);
create index asset_owner_idx on asset (owner_id, created_at desc);

create table post_media (
  post_id uuid not null references club_post (id) on delete cascade,
  asset_id uuid not null references asset (id) on delete cascade,
  position smallint not null check (position between 0 and 9),
  primary key (post_id, asset_id),
  unique (post_id, position)
);
create index post_media_asset_idx on post_media (asset_id);

-- A post can be photos alone, and can belong to a ride event's album.
do $$
declare c record;
begin
  for c in select conname from pg_constraint where conrelid = 'club_post'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%char_length(body)%' loop
    execute format('alter table club_post drop constraint %I', c.conname);
  end loop;
end $$;
alter table club_post add column photo_count smallint not null default 0 check (photo_count between 0 and 10);
alter table club_post add column event_id uuid references ride_event (id) on delete set null;
-- How many of each reaction the post has, kept in step by the code that sets a reaction, so reading a feed never counts rows.
alter table club_post add column reaction_counts jsonb not null default '{}';
alter table club_post add constraint club_post_body_len check (char_length(body) <= 1000);
alter table club_post add constraint club_post_body_or_photo check (char_length(body) >= 1 or photo_count > 0);
create index club_post_page_idx on club_post (club_id, created_at desc, id desc) where parent_id is null and status = 'visible';
create index club_post_event_idx on club_post (event_id, created_at desc) where event_id is not null;

-- One reaction per person per post; `target_kind` leaves room for comments and rides later.
create table reaction (
  target_kind text not null check (target_kind in ('post')),
  target_id uuid not null,
  user_id uuid not null references app_user (id) on delete cascade,
  emoji text not null check (emoji in ('like', 'love', 'fire', 'laugh', 'wow', 'thanks')),
  created_at timestamptz not null default now(),
  primary key (target_kind, target_id, user_id)
);
create index reaction_target_idx on reaction (target_kind, target_id);

alter table asset enable row level security;
alter table post_media enable row level security;
alter table reaction enable row level security;
revoke all on asset, post_media, reaction from anon, authenticated;
