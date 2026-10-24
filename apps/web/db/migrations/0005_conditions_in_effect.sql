-- Condition events dated in the future are not in effect yet. The public views compute the current condition
-- at read time from the events (so it cannot go stale), and the stored trail.condition_current follows the same rule.

create or replace function refresh_trail_current(p_trail_id uuid) returns void
language sql
as $$
  update trail t set
    access_class_current = coalesce(
      (select a.access_class from access_assessment a where a.trail_id = t.id order by a.created_at desc, a.id desc limit 1), 'unknown'),
    access_verification_level_current = coalesce(
      (select a.level from access_assessment a where a.trail_id = t.id order by a.created_at desc, a.id desc limit 1), 'unverified'),
    access_verified_until =
      (select a.valid_until from access_assessment a where a.trail_id = t.id order by a.created_at desc, a.id desc limit 1),
    condition_current = coalesce(
      (select c.status from condition_event c
        where c.trail_id = t.id and c.effective_from <= current_date
        order by c.effective_from desc, c.recorded_at desc, c.id desc limit 1), 'unknown'),
    updated_at = now()
  where t.id = p_trail_id;
$$;

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
  t.updated_at
from trail t
join trail_revision rev on rev.id = t.published_revision_id
join region st on st.id = t.state_id
join region ds on ds.id = t.region_id
left join lateral (
  select a.verified_at from access_assessment a where a.trail_id = t.id order by a.created_at desc, a.id desc limit 1
) la on true
left join lateral (
  select c.status, c.expected_until from condition_event c
  where c.trail_id = t.id and c.effective_from <= current_date
  order by c.effective_from desc, c.recorded_at desc, c.id desc limit 1
) lc on true
where t.lifecycle = 'published';

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
  t.first_published_at
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
