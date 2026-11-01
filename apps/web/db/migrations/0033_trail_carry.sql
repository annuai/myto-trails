-- What to carry and when to arrive: optional versioned content on a trail revision, submitted and moderated like
-- hazards and safety_notes. Existing trails have none of it and show nothing.
-- The arrival window is the best time of day to reach the trail (minutes after midnight), separate from best_months.

alter table trail_revision
  add column water_litres numeric(3, 1) check (water_litres is null or water_litres between 0.5 and 20),
  add column carry text[] not null default '{}' check (carry <@ array['puncture_kit', 'tyre_inflator', 'tool_kit', 'first_aid', 'rain_gear', 'extra_fuel', 'torch', 'power_bank', 'offline_map', 'snacks', 'cash', 'tow_strap', 'sun_protection', 'warm_layer']),
  add column carry_notes text check (carry_notes is null or char_length(carry_notes) <= 300),
  add column arrival_from_min smallint check (arrival_from_min between 0 and 1439),
  add column arrival_to_min smallint check (arrival_to_min between 0 and 1439),
  add column arrival_note text check (arrival_note is null or char_length(arrival_note) <= 200),
  add constraint trail_revision_arrival_window check (
    (arrival_from_min is null and arrival_to_min is null)
    or (arrival_from_min is not null and arrival_to_min is not null and arrival_from_min <= arrival_to_min)
  );

-- The detail view selects pt.*, so it is rebuilt to carry the new columns (nothing depends on it).
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
  ) as has_gpx,
  rev.water_litres,
  rev.carry,
  rev.carry_notes,
  rev.arrival_from_min,
  rev.arrival_to_min,
  rev.arrival_note
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
