-- Submission workflow (docs/06 submission, docs/04 §5). A draft lives here as partial form data; the strict core
-- tables (trail, trail_revision, ...) are written only when the contributor submits.

create table submission (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  client_id uuid not null,
  kind text not null default 'new_trail' check (kind in ('new_trail', 'edit')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'changes_requested', 'approved', 'rejected', 'withdrawn')),
  step integer not null default 1 check (step between 1 and 6),
  data jsonb not null default '{}',
  trail_id uuid references trail (id) on delete set null,
  revision_id uuid references trail_revision (id) on delete set null,
  route_upload_id uuid references upload (id) on delete set null,
  duplicate_candidates jsonb not null default '[]',
  contributor_note text check (contributor_note is null or char_length(contributor_note) <= 1000),
  moderator_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (user_id, client_id)
);
create index submission_user_idx on submission (user_id, updated_at desc);
create index submission_queue_idx on submission (status, submitted_at);

alter table submission enable row level security;
revoke all on submission from anon, authenticated;
