-- Duplicate-route similarity without polygon buffers or line intersections: the share of the shorter route's points
-- (densified to one every 50 m) that lie within 25 m of the other route. Uses only ST_DWithin, which behaves the same
-- across PostGIS and GEOS versions. Still limited to published, standard-sensitivity trails.
create or replace function find_similar_routes(p_line geometry, p_exclude_route uuid default null)
returns table (route_id uuid, similarity double precision)
language sql
stable
as $$
  with cand as (
    select r.id, r.simplified as other
    from route r
    join trail t on t.published_revision_id = r.revision_id and t.lifecycle = 'published' and t.sensitivity = 'standard'
    where r.simplified && st_expand(p_line, 0.01)
      and (p_exclude_route is null or r.id <> p_exclude_route)
      and st_dwithin(r.simplified::geography, p_line::geography, 25)
  ),
  shorter as (
    select c.id,
      case when st_length(p_line::geography) <= st_length(c.other::geography) then p_line else c.other end as small,
      case when st_length(p_line::geography) <= st_length(c.other::geography) then c.other else p_line end as large
    from cand c
  ),
  scored as (
    select s.id,
      avg((st_dwithin(d.geom::geography, s.large::geography, 25))::int)::double precision as sim
    from shorter s
    cross join lateral st_dumppoints(st_segmentize(s.small::geography, 50)::geometry) d
    group by s.id
  )
  select id, sim from scored where sim >= 0.5 order by sim desc
$$;

revoke execute on function find_similar_routes(geometry, uuid) from public;
