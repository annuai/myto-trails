-- Device tokens for the public API (docs/06 device, docs/14). Only the hash is stored.
create table api_token (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  kind text not null check (kind in ('app_ios', 'app_android', 'navi')),
  label text not null check (char_length(label) between 1 and 60),
  token_hash text not null unique,
  scopes text[] not null check (cardinality(scopes) >= 1 and scopes <@ array['saved', 'write:submission']),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index api_token_user_idx on api_token (user_id, created_at desc);

alter table api_token enable row level security;
revoke all on api_token from anon, authenticated;
