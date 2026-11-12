-- Opt-in ride standing. A rider who turns it on uploads one coarse summary per ride: a day, a distance, a duration, a 1-degree
-- grid cell and an optional bike class. Never a route, a coordinate or a start time. `rollup_cohort_stats` turns the summaries
-- of opted-in riders into per-cell deciles; the public endpoint reads only those. Deleting an account deletes its rows (cascade),
-- and turning opt-in off deletes the rider's summaries (done by the server in setOptIn).
create table rider_standing_pref (
  user_id uuid primary key references app_user(id) on delete cascade,
  opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);
create table ride_summary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  ride_ref text not null check (char_length(ride_ref) between 1 and 80),
  day date not null,
  distance_km numeric not null check (distance_km >= 0 and distance_km < 5000),
  duration_s integer not null check (duration_s >= 0),
  cell text not null check (cell ~ '^-?[0-9]{1,3}:-?[0-9]{1,3}$'),
  bike_class text check (bike_class is null or char_length(bike_class) between 1 and 30),
  unique (user_id, ride_ref)
);
create index ride_summary_cell_day_idx on ride_summary (cell, day);
create table cohort_stat (
  cell text not null,
  period text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  metric text not null check (metric in ('distance_km', 'rides', 'longest_ride_km')),
  n integer not null check (n >= 1),
  deciles numeric[] not null check (array_length(deciles, 1) = 9),
  primary key (cell, period, metric)
);

alter table rider_standing_pref enable row level security;
alter table ride_summary enable row level security;
alter table cohort_stat enable row level security;
revoke all on rider_standing_pref, ride_summary, cohort_stat from anon, authenticated;

-- Recomputes the current and previous month. Counts only riders who are opted in right now. A (cell, period) that no longer
-- has any opted-in rider loses its rows, so a rider who leaves is not left behind in a stale cohort.
create function rollup_cohort_stats() returns void language plpgsql as $$
declare
  periods text[] := array[to_char(now(), 'YYYY-MM'), to_char(now() - interval '1 month', 'YYYY-MM')];
begin
  delete from cohort_stat where period = any(periods);
  insert into cohort_stat (cell, period, metric, n, deciles)
  with per_rider as (
    select s.cell, to_char(s.day, 'YYYY-MM') as period, s.user_id,
           sum(s.distance_km) as distance_km, count(*)::numeric as rides, max(s.distance_km) as longest_ride_km
    from ride_summary s
    join rider_standing_pref p on p.user_id = s.user_id and p.opt_in
    where to_char(s.day, 'YYYY-MM') = any(periods)
    group by s.cell, to_char(s.day, 'YYYY-MM'), s.user_id
  ), flat as (
    select cell, period, m.metric, m.value
    from per_rider r
    cross join lateral (values ('distance_km', r.distance_km), ('rides', r.rides), ('longest_ride_km', r.longest_ride_km)) as m(metric, value)
  )
  select cell, period, metric, count(*)::integer,
         percentile_cont(array[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) within group (order by value)::numeric[]
  from flat group by cell, period, metric;
end $$;
revoke all on function rollup_cohort_stats() from public, anon, authenticated;
