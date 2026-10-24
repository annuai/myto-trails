-- Accounts, sessions, rate limits, saved trails and trail reports (docs/06). All of these are private:
-- row-level security is on, there are no policies and no grants for anon/authenticated. The application reads
-- them with the owner connection through functions that take the user id from a verified session.

create table app_user (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+$' and char_length(email) <= 254),
  display_name text not null check (char_length(display_name) between 2 and 40),
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table user_role (
  user_id uuid not null references app_user (id) on delete cascade,
  role text not null check (role in ('moderator', 'admin')),
  region_id uuid references region (id),
  granted_by uuid references app_user (id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table login_token (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  ip_hash text
);
create index login_token_email_idx on login_token (email, created_at desc);

create table auth_session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  user_agent_hash text
);
create index auth_session_user_idx on auth_session (user_id);

create table rate_limit (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);
create index rate_limit_window_idx on rate_limit (window_start);

-- Fixed-window counter. Returns true while the caller is within the limit.
create function rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  delete from rate_limit where window_start < now() - interval '1 day';
  insert into rate_limit (key, window_start, count) values (p_key, v_window, 1)
    on conflict (key, window_start) do update set count = rate_limit.count + 1
    returning count into v_count;
  return v_count <= p_limit;
end
$$;

create table collection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  is_default boolean not null default false,
  visibility text not null default 'private' check (visibility in ('private', 'link')),
  created_at timestamptz not null default now()
);
create unique index collection_one_default_idx on collection (user_id) where is_default;

create table collection_item (
  collection_id uuid not null references collection (id) on delete cascade,
  trail_id uuid not null references trail (id) on delete cascade,
  added_at timestamptz not null default now(),
  last_seen_state jsonb not null default '{}',
  completed_at timestamptz,
  primary key (collection_id, trail_id)
);

create table trail_report (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references trail (id) on delete cascade,
  reporter_id uuid not null references app_user (id),
  type text not null check (type in ('closure', 'wrong_access', 'wrong_location', 'unsafe_info', 'duplicate', 'inaccurate_gpx', 'environmental', 'other')),
  details text not null check (char_length(details) between 20 and 2000),
  priority text not null default 'normal' check (priority in ('normal', 'high')),
  status text not null default 'open' check (status in ('open', 'triaged', 'accepted', 'rejected', 'needs_info', 'duplicate_of_report')),
  resolution_note text,
  resolved_by uuid references app_user (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index trail_report_trail_idx on trail_report (trail_id, created_at desc);
create index trail_report_queue_idx on trail_report (status, priority, created_at);

alter table app_user enable row level security;
alter table user_role enable row level security;
alter table login_token enable row level security;
alter table auth_session enable row level security;
alter table rate_limit enable row level security;
alter table collection enable row level security;
alter table collection_item enable row level security;
alter table trail_report enable row level security;

revoke all on app_user, user_role, login_token, auth_session, rate_limit, collection, collection_item, trail_report from anon, authenticated;
revoke execute on function rate_limit_hit(text, integer, integer) from public;

-- Public detail view gains a count of recent open closure reports (no reporter data) so the page can warn riders.
create or replace view public_trail_detail as
select
  pt.*,
  rev.description,
  rev.suitable_for,
  rev.best_months,
  rev.season_notes,
  rev.hazards,
  rev.safety_notes,
  rev.surface_notes,
  rev.route_shape,
  rev.elevation_gain_m,
  rev.version_no,
  rev.contributor_credit,
  la.restrictions,
  la.permission_instructions,
  coalesce((select count(*)::int from evidence e where e.assessment_id = la.id), 0) as evidence_count,
  coalesce((select array_agg(distinct e.kind order by e.kind) from evidence e where e.assessment_id = la.id), '{}'::text[]) as evidence_kinds,
  lc.reason as condition_reason,
  lc.note as condition_note,
  t.sensitivity,
  case
    when t.sensitivity = 'standard' then st_x(coalesce(t.public_point, rev.start_point)::geometry)
    else st_x(t.public_point::geometry)
  end as lon,
  case
    when t.sensitivity = 'standard' then st_y(coalesce(t.public_point, rev.start_point)::geometry)
    else st_y(t.public_point::geometry)
  end as lat,
  t.first_published_at,
  (
    select count(*)::int from trail_report r
    where r.trail_id = t.id and r.type = 'closure' and r.status in ('open', 'triaged') and r.created_at > now() - interval '30 days'
  ) as open_closure_reports
from public_trails pt
join trail t on t.id = pt.id
join trail_revision rev on rev.id = t.published_revision_id
left join lateral (
  select a.id, a.restrictions, a.permission_instructions
  from access_assessment a where a.trail_id = t.id order by a.created_at desc, a.id desc limit 1
) la on true
left join lateral (
  select c.reason, c.note from condition_event c
  where c.trail_id = t.id and c.effective_from <= current_date
  order by c.effective_from desc, c.recorded_at desc, c.id desc limit 1
) lc on true;
