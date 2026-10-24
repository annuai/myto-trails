-- Community core: member declaration and privacy, "I've ridden here", trail comments, content reports.
-- Tables are private; the public site reads only the views below, which never expose emails or account ids.

alter table app_user add column adult_confirmed_at timestamptz;
alter table app_user add column profile_public boolean not null default false;
alter table app_user add column is_woman boolean not null default false;
alter table app_user add column bio text check (bio is null or char_length(bio) <= 300);
-- An opaque handle for other riders to refer to this rider; the account id itself is never public.
alter table app_user add column public_id uuid not null default gen_random_uuid() unique;

create table trail_ridden (
  user_id uuid not null references app_user (id) on delete cascade,
  trail_id uuid not null references trail (id) on delete cascade,
  ridden_month date check (ridden_month is null or ridden_month = date_trunc('month', ridden_month)::date),
  bike text check (bike is null or char_length(bike) <= 60),
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now(),
  primary key (user_id, trail_id)
);
create index trail_ridden_trail_idx on trail_ridden (trail_id, created_at desc);

create table trail_comment (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references trail (id) on delete cascade,
  user_id uuid not null references app_user (id) on delete cascade,
  parent_id uuid references trail_comment (id) on delete cascade,
  body text not null check (char_length(body) between 2 and 1500),
  tag text check (tag is null or tag in ('gate_closed', 'water_high', 'blocked', 'good_condition', 'tip')),
  status text not null default 'visible' check (status in ('pending', 'visible', 'hidden')),
  hidden_reason text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index trail_comment_trail_idx on trail_comment (trail_id, created_at desc);
create index trail_comment_user_idx on trail_comment (user_id, created_at desc);

create table content_report (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('comment', 'question', 'group', 'group_post', 'profile')),
  subject_id uuid not null,
  reporter_id uuid references app_user (id) on delete set null,
  reason text not null check (char_length(reason) between 5 and 500),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index content_report_once_idx on content_report (subject_type, subject_id, reporter_id) where reporter_id is not null;
create index content_report_queue_idx on content_report (status, created_at);

alter table trail_ridden enable row level security;
alter table trail_comment enable row level security;
alter table content_report enable row level security;
revoke all on trail_ridden, trail_comment, content_report from anon, authenticated;

-- How many riders say they have ridden a trail (private riders included) and when the latest ride was.
create view public_trail_rider_counts as
select t.slug as trail_slug, count(*)::int as riders, max(coalesce(r.ridden_month, r.created_at::date)) as last_ridden
from trail_ridden r
join app_user u on u.id = r.user_id and u.status = 'active'
join trail t on t.id = r.trail_id and t.lifecycle = 'published'
group by t.slug;

-- Riders who chose to be listed.
create view public_trail_riders as
select t.slug as trail_slug, u.public_id as rider_id, u.display_name, r.ridden_month, r.bike, r.note, r.created_at
from trail_ridden r
join app_user u on u.id = r.user_id and u.status = 'active' and u.profile_public
join trail t on t.id = r.trail_id and t.lifecycle = 'published';

-- Comments that are visible and not deleted. The author's handle is shown only when their profile is public.
create view public_trail_comments as
select t.slug as trail_slug, c.id, c.parent_id, c.body, c.tag, c.created_at, c.edited_at,
  u.display_name as author_name,
  case when u.profile_public then u.public_id end as author_id
from trail_comment c
join app_user u on u.id = c.user_id and u.status = 'active'
join trail t on t.id = c.trail_id and t.lifecycle = 'published'
where c.status = 'visible' and c.deleted_at is null;

grant select on public_trail_rider_counts, public_trail_riders, public_trail_comments to anon, authenticated;
