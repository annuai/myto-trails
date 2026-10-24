-- Gazetteer for place search, full-text search on trails, and the public search view.

create table place (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(name) between 1 and 120),
  alt_names text[] not null default '{}',
  kind text not null check (kind in ('city', 'town', 'village', 'hill_station')),
  state_id uuid not null references region (id),
  point geography (point, 4326) not null
    check (st_x(point::geometry) between 68 and 98 and st_y(point::geometry) between 6 and 37),
  rank smallint not null default 3 check (rank between 1 and 5),
  search_text text not null default ''
);

create function place_set_search_text() returns trigger
language plpgsql
as $$
begin
  new.search_text := lower(new.name || ' ' || array_to_string(new.alt_names, ' '));
  return new;
end
$$;

create trigger place_search_text before insert or update on place
  for each row execute function place_set_search_text();

create index place_search_trgm_idx on place using gin (search_text gin_trgm_ops);
create index place_point_idx on place using gist (point);

alter table place enable row level security;
revoke all on place from anon, authenticated;
revoke execute on function place_set_search_text() from public;

create view public_places as
select
  p.id,
  p.slug,
  p.name,
  p.alt_names,
  p.kind,
  s.slug as state_slug,
  s.name as state_name,
  st_x(p.point::geometry) as lon,
  st_y(p.point::geometry) as lat,
  p.rank,
  p.search_text
from place p
join region s on s.id = p.state_id;

grant select on public_places to anon, authenticated;

alter table trail_revision add column search_tsv tsvector generated always as (
  setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(nearest_town, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(summary, '')), 'C')
) stored;

create index trail_revision_search_idx on trail_revision using gin (search_tsv);

-- Search view: published trails with their public point only (never the exact start of a sensitive trail).
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
