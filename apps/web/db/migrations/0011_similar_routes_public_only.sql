-- Duplicate checks may only reveal what the public site already shows: routes of published, standard-sensitivity
-- trails. Uploads, drafts and sensitive trails must not be probeable through the similarity score.
create or replace function find_similar_routes(p_line geometry, p_exclude_route uuid default null)
returns table (route_id uuid, similarity double precision)
language sql
stable
as $$
  select r.id,
    least(1.0, st_length(st_intersection(st_buffer(r.simplified::geography, 25)::geometry, p_line)::geography)
      / nullif(least(st_length(p_line::geography), st_length(r.simplified::geography)), 0)) as similarity
  from route r
  join trail t on t.published_revision_id = r.revision_id and t.lifecycle = 'published' and t.sensitivity = 'standard'
  where r.simplified && st_expand(p_line, 0.01)
    and (p_exclude_route is null or r.id <> p_exclude_route)
    and st_dwithin(r.simplified::geography, p_line::geography, 25)
    and least(1.0, st_length(st_intersection(st_buffer(r.simplified::geography, 25)::geometry, p_line)::geography)
      / nullif(least(st_length(p_line::geography), st_length(r.simplified::geography)), 0)) >= 0.5
  order by similarity desc
$$;
