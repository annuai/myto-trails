-- Uploads, routes and GPX files (docs/06, docs/05 §8-9). Private tables; the public site sees routes only through
-- public_trail_route, and never for sensitive trails.

create table upload (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  kind text not null check (kind in ('gpx', 'image')),
  bucket text not null default 'quarantine' check (bucket in ('quarantine', 'originals', 'public')),
  storage_key text not null unique,
  content_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'rejected', 'removed')),
  reject_code text,
  reject_message text,
  route_id uuid,
  media_id uuid,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index upload_user_idx on upload (user_id, created_at desc);

create table route (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid unique references trail_revision (id) on delete cascade,
  geometry geometry (linestring, 4326) not null,
  simplified geometry (linestring, 4326) not null,
  distance_km numeric(7, 2) not null check (distance_km > 0),
  elev_gain_m integer,
  elev_loss_m integer,
  min_elev_m integer,
  max_elev_m integer,
  point_count integer not null check (point_count > 0),
  has_timestamps boolean not null default false,
  moving_time_s integer,
  stopped_time_s integer,
  avg_moving_speed_kmh numeric(5, 1),
  profile jsonb,
  waypoints jsonb not null default '[]',
  fingerprint text not null,
  created_by uuid references app_user (id) on delete set null,
  created_at timestamptz not null default now()
);
create index route_simplified_idx on route using gist (simplified);
create index route_fingerprint_idx on route (fingerprint);

create table gpx_file (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references route (id) on delete cascade,
  uploaded_by uuid references app_user (id) on delete set null,
  source text not null default 'uploaded' check (source in ('uploaded', 'app_recorded', 'navi_recorded')),
  client_id uuid,
  storage_key_original text not null,
  storage_key_sanitised text,
  sha256 text not null,
  size_bytes integer not null check (size_bytes > 0),
  status text not null default 'ready' check (status in ('ready', 'retired')),
  download_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index gpx_file_route_idx on gpx_file (route_id);

alter table media alter column revision_id drop not null;
alter table media add column uploaded_by uuid references app_user (id) on delete set null;
alter table media add column upload_id uuid references upload (id) on delete set null;
alter table media add column placeholder text;

alter table upload add constraint upload_route_fk foreign key (route_id) references route (id) on delete set null;
alter table upload add constraint upload_media_fk foreign key (media_id) references media (id) on delete set null;

alter table upload enable row level security;
alter table route enable row level security;
alter table gpx_file enable row level security;
revoke all on upload, route, gpx_file from anon, authenticated;

-- Routes of published, standard-sensitivity trails only: the simplified line and the numbers, never the full track.
create view public_trail_route as
select
  t.slug as slug,
  r.distance_km,
  r.elev_gain_m,
  r.elev_loss_m,
  r.min_elev_m,
  r.max_elev_m,
  r.point_count,
  r.profile,
  st_asgeojson(r.simplified, 5) as simplified_geojson
from route r
join trail t on t.published_revision_id = r.revision_id
where t.lifecycle = 'published' and t.sensitivity = 'standard';

grant select on public_trail_route to anon, authenticated;

-- Candidate duplicates for a new line: how much of the shorter route lies within 25 m of the other.
create function find_similar_routes(p_line geometry, p_exclude_route uuid default null)
returns table (route_id uuid, similarity double precision)
language sql
stable
as $$
  select r.id,
    least(1.0, st_length(st_intersection(st_buffer(r.simplified::geography, 25)::geometry, p_line)::geography)
      / nullif(least(st_length(p_line::geography), st_length(r.simplified::geography)), 0)) as similarity
  from route r
  where r.simplified && st_expand(p_line, 0.01)
    and (p_exclude_route is null or r.id <> p_exclude_route)
    and st_dwithin(r.simplified::geography, p_line::geography, 25)
    and least(1.0, st_length(st_intersection(st_buffer(r.simplified::geography, 25)::geometry, p_line)::geography)
      / nullif(least(st_length(p_line::geography), st_length(r.simplified::geography)), 0)) >= 0.5
  order by similarity desc
$$;

revoke execute on function find_similar_routes(geometry, uuid) from public;

-- The detail view gains has_gpx (a ready GPX is attached to the published revision's route).
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
  ) as open_closure_reports,
  exists (
    select 1 from route rt join gpx_file g on g.route_id = rt.id
    where rt.revision_id = t.published_revision_id and g.status = 'ready'
  ) as has_gpx
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
