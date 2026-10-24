-- Public read boundary. Base tables have row-level security enabled and no policies for anon/authenticated,
-- and no table grants. The public site reads only these views, which run with the owner's rights and expose
-- published rows and safe columns only. Server code additionally runs public reads as role anon.

alter table region enable row level security;
alter table trail enable row level security;
alter table trail_revision enable row level security;
alter table access_assessment enable row level security;
alter table evidence enable row level security;
alter table condition_event enable row level security;
alter table media enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke execute on function refresh_trail_current(uuid) from public;
revoke execute on function trigger_refresh_trail_current() from public;

create view public_regions as
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
  ) as published_trail_count
from region r
left join region p on p.id = r.parent_id;

create view public_trails as
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
  t.condition_current,
  to_char(lc.expected_until, 'YYYY-MM-DD') as condition_expected_until,
  t.access_verification_level_current as verification_level,
  to_char(la.verified_at, 'YYYY-MM-DD') as verified_at,
  to_char(t.access_verified_until, 'YYYY-MM-DD') as valid_until,
  t.is_sample,
  t.updated_at
from trail t
join trail_revision rev on rev.id = t.published_revision_id
join region st on st.id = t.state_id
join region ds on ds.id = t.region_id
left join lateral (
  select a.verified_at from access_assessment a where a.trail_id = t.id order by a.created_at desc, a.id desc limit 1
) la on true
left join lateral (
  select c.expected_until from condition_event c where c.trail_id = t.id order by c.effective_from desc, c.recorded_at desc, c.id desc limit 1
) lc on true
where t.lifecycle = 'published';

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
  t.first_published_at
from public_trails pt
join trail t on t.id = pt.id
join trail_revision rev on rev.id = t.published_revision_id
left join lateral (
  select a.id, a.restrictions, a.permission_instructions
  from access_assessment a where a.trail_id = t.id order by a.created_at desc, a.id desc limit 1
) la on true
left join lateral (
  select c.reason, c.note from condition_event c where c.trail_id = t.id order by c.effective_from desc, c.recorded_at desc, c.id desc limit 1
) lc on true;

create view public_trail_media as
select
  t.slug as trail_slug,
  m.role,
  m.position,
  m.caption,
  m.alt_text,
  m.credit,
  m.variants,
  m.width,
  m.height
from media m
join trail t on t.published_revision_id = m.revision_id
where t.lifecycle = 'published';

grant select on public_regions, public_trails, public_trail_detail, public_trail_media to anon, authenticated;
