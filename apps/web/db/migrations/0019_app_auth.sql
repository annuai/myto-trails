-- One-time codes that let the phone app trade a website sign-in for a device token (PKCE: the code is only useful
-- to the app that holds the matching verifier). Only the hash of a code is stored. Closed to the public roles.

create table app_auth_code (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  code_hash text not null unique,
  code_challenge text not null check (code_challenge ~ '^[A-Za-z0-9_-]{43}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index app_auth_code_user_idx on app_auth_code (user_id, created_at desc);

alter table app_auth_code enable row level security;
revoke all on app_auth_code from anon, authenticated;
