-- Moderation (docs/06 moderation_record and audit_log, docs/11). Both tables are append-only: triggers refuse UPDATE
-- and DELETE for every role. Actor columns hold plain ids (no foreign keys) so removing an account can never rewrite
-- or block history.

create table moderation_record (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('revision', 'report', 'media', 'gpx', 'user')),
  subject_id uuid not null,
  moderator_id uuid not null,
  action text not null check (action in ('approve', 'request_changes', 'reject', 'publish_limited', 'unpublish', 'hold', 'release', 'verify_access', 'remove_media', 'suspend_user', 'resolve_report', 'set_condition')),
  reason_code text check (reason_code is null or reason_code in ('duplicate', 'insufficient_information', 'unverifiable_access', 'private_property', 'protected_area_risk', 'unsafe_content', 'inaccurate_gpx', 'copyright', 'spam')),
  comment text check (comment is null or char_length(comment) <= 4000),
  field_comments jsonb not null default '{}',
  visible_to_author boolean not null default false,
  created_at timestamptz not null default clock_timestamp()
);
create index moderation_record_subject_idx on moderation_record (subject_type, subject_id, created_at);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  before jsonb,
  after jsonb,
  ip_hash text,
  request_id text,
  created_at timestamptz not null default clock_timestamp()
);
create index audit_log_entity_idx on audit_log (entity_type, entity_id, created_at);
create index audit_log_actor_idx on audit_log (actor_id, created_at);

create function refuse_change() returns trigger language plpgsql as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '55000';
end
$$;
create trigger moderation_record_append_only before update or delete on moderation_record for each row execute function refuse_change();
create trigger audit_log_append_only before update or delete on audit_log for each row execute function refuse_change();
create trigger moderation_record_no_truncate before truncate on moderation_record for each statement execute function refuse_change();
create trigger audit_log_no_truncate before truncate on audit_log for each statement execute function refuse_change();

alter table submission add column first_approver uuid;
alter table submission add column first_approved_at timestamptz;
alter table submission add column decided_by uuid;
alter table submission add column decided_at timestamptz;

alter table moderation_record enable row level security;
alter table audit_log enable row level security;
revoke all on moderation_record, audit_log from anon, authenticated;
