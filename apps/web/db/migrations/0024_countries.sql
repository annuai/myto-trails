-- Countries as data. A country is a `region` row of kind 'country' with an ISO code, an `enabled` flag and its config
-- (emergency number, currency, units, default time zone). Only enabled countries accept trails; the rest are "coming soon".
-- Outlines live in country_boundary so a point can be placed in a country.

alter table region
  add column iso2 text check (iso2 is null or iso2 ~ '^[A-Z]{2}$'),
  add column enabled boolean not null default false,
  add column config jsonb not null default '{}',
  add constraint region_iso2_country_only check (iso2 is null or kind = 'country');
create unique index region_country_iso2_idx on region (iso2) where kind = 'country';

update region
set iso2 = 'IN',
    enabled = true,
    config = '{"iso2":"IN","name":"India","emergency":{"primary":"112","others":[]},"dialCode":"+91","currency":"INR","distanceUnit":"km","timeZone":"Asia/Kolkata","adminLabels":{"level1":"state","level2":"district"}}'::jsonb
where kind = 'country' and slug = 'india' and parent_id is null;

create table country_boundary (
  country_id uuid primary key references region (id) on delete cascade,
  geom geometry (multipolygon, 4326) not null
);
create index country_boundary_geom_idx on country_boundary using gist (geom);
alter table country_boundary enable row level security;
revoke all on country_boundary from anon, authenticated;

-- A trail's country is its state's country. Kept by a trigger so every insert path stays correct.
alter table trail add column country_id uuid references region (id);
update trail t set country_id = s.parent_id from region s where s.id = t.state_id;
create function set_trail_country() returns trigger language plpgsql as $$
begin
  select parent_id into new.country_id from region where id = new.state_id;
  return new;
end $$;
create trigger trail_country before insert or update of state_id on trail
  for each row execute function set_trail_country();
create index trail_country_idx on trail (country_id);

-- Set when a submitted start point matched no country outline (open sea, a gap); a moderator places it.
alter table trail_revision add column country_unmatched boolean not null default false;

-- Coordinates are valid anywhere on Earth. (The geography type already limits them to -180..180 and -90..90.)
alter table trail_revision drop constraint if exists trail_revision_start_point_check;
alter table place drop constraint if exists place_point_check;

-- Public views gain the country as their last columns, so existing readers keep working.
create or replace view public_regions as
select
  r.id,
  r.kind,
  r.name,
  r.slug,
  p.slug as parent_slug,
  (
    select count(*)::int
    from trail t
    where t.lifecycle = 'published'
      and t.published_revision_id is not null
      and (r.kind = 'country' or t.state_id = r.id or t.region_id = r.id)
  ) as published_trail_count,
  c.slug as country_slug,
  c.iso2 as country_iso2
from region r
left join region p on p.id = r.parent_id
left join region g on g.id = p.parent_id
left join region c on c.id = case r.kind when 'country' then r.id when 'state' then p.id else g.id end;

create or replace view public_trails as
select
  t.id,
  t.slug,
  rev.name,
  rev.summary,
  rev.nearest_town,
  st.slug as state_slug,
  st.name as state_name,
  case when ds.kind = 'district' then ds.slug end as district_slug,
  case when ds.kind = 'district' then ds.name end as district_name,
  rev.difficulty,
  rev.terrain,
  rev.distance_km,
  rev.est_duration_min,
  t.access_class_current as access_class,
  coalesce(lc.status, 'unknown') as condition_current,
  to_char(lc.expected_until, 'YYYY-MM-DD') as condition_expected_until,
  t.access_verification_level_current as verification_level,
  to_char(la.verified_at, 'YYYY-MM-DD') as verified_at,
  to_char(t.access_verified_until, 'YYYY-MM-DD') as valid_until,
  t.is_sample,
  t.updated_at,
  co.slug as country_slug,
  co.iso2 as country_iso2
from trail t
join trail_revision rev on rev.id = t.published_revision_id
join region st on st.id = t.state_id
join region ds on ds.id = t.region_id
left join region co on co.id = t.country_id
left join lateral (
  select a.verified_at from access_assessment a where a.trail_id = t.id order by a.created_at desc, a.id desc limit 1
) la on true
left join lateral (
  select c.status, c.expected_until from condition_event c
  where c.trail_id = t.id and c.effective_from <= current_date
  order by c.effective_from desc, c.recorded_at desc, c.id desc limit 1
) lc on true
where t.lifecycle = 'published';

-- The detail and search views select pt.*, so they are rebuilt to carry the new columns (nothing depends on them).
drop view public_trail_detail;
create view public_trail_detail as
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
grant select on public_trail_detail to anon, authenticated;

-- Search view:
drop view public_trail_search;
create view public_trail_search as
select
  pt.*,
  rev.suitable_for,
  rev.best_months,
  rev.search_tsv,
  t.first_published_at,
  case when t.sensitivity = 'standard' then coalesce(t.public_point, rev.start_point) else t.public_point end as geog,
  case
    when t.sensitivity = 'standard' then st_x(coalesce(t.public_point, rev.start_point)::geometry)
    else st_x(t.public_point::geometry)
  end as lon,
  case
    when t.sensitivity = 'standard' then st_y(coalesce(t.public_point, rev.start_point)::geometry)
    else st_y(t.public_point::geometry)
  end as lat,
  (
    pt.condition_current = 'permanently_closed'
    or (pt.condition_current = 'temporarily_closed' and (pt.condition_expected_until is null or pt.condition_expected_until >= to_char(current_date, 'YYYY-MM-DD')))
  ) as closed,
  (
    pt.verification_level in ('officially_verified', 'moderator_verified')
    and (pt.valid_until is null or pt.valid_until >= to_char(current_date, 'YYYY-MM-DD'))
  ) as is_verified
from public_trails pt
join trail t on t.id = pt.id
join trail_revision rev on rev.id = t.published_revision_id;
grant select on public_trail_search to anon, authenticated;

-- Countries the app can show: open ones, and the ones that are coming soon.
create view public_countries as
select iso2, name, slug, enabled
from region
where kind = 'country' and iso2 is not null;
grant select on public_countries to anon, authenticated;
