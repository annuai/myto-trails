-- "Safe for women riders": women riders mark a trail they found safe. Privacy: a mark is never shown with a name and nobody
-- can read who marked; the public site sees only a count of distinct riders over the last 24 months, computed by the server.
-- Only a rider whose private gender is female may mark (checked by the server), one mark per rider per trail.

create table trail_women_safe (
  trail_id uuid not null references trail (id) on delete cascade,
  user_id uuid not null references app_user (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trail_id, user_id)
);
create index trail_women_safe_trail_idx on trail_women_safe (trail_id, created_at desc);

alter table trail_women_safe enable row level security;
revoke all on trail_women_safe from anon, authenticated;
