-- One row per scheduled job: when it last finished. The check-in sweep emails a rider's contact, so a sweep that silently stopped
-- (wrong secret, GitHub not scheduling it) must be noticed. /api/cron/watchdog reads this and fails when it is too old.
create table cron_heartbeat (
  job text primary key check (char_length(job) between 1 and 60),
  last_ok_at timestamptz not null default now()
);
alter table cron_heartbeat enable row level security;
revoke all on cron_heartbeat from anon, authenticated;
