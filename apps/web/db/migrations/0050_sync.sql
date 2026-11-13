-- Sync between a rider's phones (docs/sync-design.md). One table for the four kinds (ride, trip, todo, moment): the API treats them
-- alike, so a table each would only repeat the same columns. `data` never holds a ride's points; they are one object in storage
-- (`track_key`, bucket originals). A delete keeps the row (deleted_at) for 30 days so it cannot come back from another phone.
-- `synced_at` is the server's clock and is what pull reads from; `updated_at` is the phone's edit time and is what conflicts compare.
create table sync_record (
  user_id uuid not null references app_user(id) on delete cascade,
  kind text not null check (kind in ('ride', 'trip', 'todo', 'moment')),
  id text not null check (id ~ '^[A-Za-z0-9._~-]{1,80}$'),
  data jsonb not null check (octet_length(data::text) <= 16384),
  updated_at timestamptz not null,
  synced_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  origin_device text not null check (char_length(origin_device) between 8 and 64),
  track_key text check (track_key is null or char_length(track_key) <= 200),
  track_bytes integer not null default 0 check (track_bytes between 0 and 409600),
  primary key (user_id, kind, id)
);
create index sync_record_pull_idx on sync_record (user_id, synced_at);
create index sync_record_tombstone_idx on sync_record (deleted_at) where deleted_at is not null;

create table sync_device (
  user_id uuid not null references app_user(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 8 and 64),
  last_pull_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

-- Row level security stays "no policies": only the API, which filters by user_id, reads these.
alter table sync_record enable row level security;
alter table sync_device enable row level security;
revoke all on sync_record, sync_device from anon, authenticated;

-- App tokens may now carry the `sync` scope (0013 allowed only saved and write:submission, which would have refused every new sign-in).
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'api_token'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%write:submission%';
  if c is not null then execute format('alter table api_token drop constraint %I', c); end if;
end $$;
alter table api_token add constraint api_token_scopes_check
  check (cardinality(scopes) >= 1 and scopes <@ array['saved', 'write:submission', 'sync']);
