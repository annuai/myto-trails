-- Questions between riders and time-limited phone sharing. The phone number is stored encrypted and only until it has
-- been revealed once for a few minutes (or the offer lapses); the application deletes the ciphertext then.

create table rider_question (
  id uuid primary key default gen_random_uuid(),
  asker_id uuid not null references app_user (id) on delete cascade,
  answerer_id uuid not null references app_user (id) on delete cascade,
  trail_id uuid references trail (id) on delete set null,
  question text not null check (char_length(question) between 5 and 500),
  answer text check (answer is null or char_length(answer) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'answered', 'declined', 'expired')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  check (asker_id <> answerer_id)
);
create unique index rider_question_one_pending_idx on rider_question (asker_id, answerer_id) where status = 'pending';
create index rider_question_answerer_idx on rider_question (answerer_id, created_at desc);
create index rider_question_asker_idx on rider_question (asker_id, created_at desc);

create table rider_block (
  blocker_id uuid not null references app_user (id) on delete cascade,
  blocked_id uuid not null references app_user (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table contact_share (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references rider_question (id) on delete cascade,
  sharer_id uuid not null references app_user (id) on delete cascade,
  recipient_id uuid not null references app_user (id) on delete cascade,
  phone_ciphertext text,
  status text not null default 'offered' check (status in ('offered', 'revealed', 'expired', 'withdrawn')),
  offered_at timestamptz not null default now(),
  offer_expires_at timestamptz not null,
  revealed_at timestamptz,
  reveal_expires_at timestamptz,
  check (status in ('offered', 'revealed') or phone_ciphertext is null)
);

alter table rider_question enable row level security;
alter table rider_block enable row level security;
alter table contact_share enable row level security;
revoke all on rider_question, rider_block, contact_share from anon, authenticated;
