-- Short videos on a trail page. Files are web-ready MP4s with a poster image (made by scripts/make-trail-video.mts);
-- the description is required, like alt text for photos, so the content has a text equivalent.
create table trail_video (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references trail_revision (id) on delete cascade,
  position integer not null default 0,
  description text not null check (char_length(description) between 5 and 300),
  caption text check (caption is null or char_length(caption) <= 160),
  credit text,
  mp4_url text not null,
  poster_url text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  duration_s integer not null check (duration_s between 1 and 600),
  created_at timestamptz not null default now()
);
create index trail_video_revision_idx on trail_video (revision_id, position);

alter table trail_video enable row level security;
revoke all on trail_video from anon, authenticated;

-- Public: only videos of a published trail's published revision.
create view public_trail_video as
select
  t.slug as trail_slug,
  v.position,
  v.description,
  v.caption,
  v.credit,
  v.mp4_url,
  v.poster_url,
  v.width,
  v.height,
  v.duration_s
from trail_video v
join trail t on t.published_revision_id = v.revision_id
where t.lifecycle = 'published';

grant select on public_trail_video to anon, authenticated;
