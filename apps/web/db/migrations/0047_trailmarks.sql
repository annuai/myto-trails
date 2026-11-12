-- Trailmarks: a thank-you for helping the map. Not money or crypto; they cannot be bought, sold, transferred or cashed out.
-- `trailmark_event` is an append-only ledger written only by the server, and only after moderation or verification has approved
-- the contribution. The unique key means a contribution can never be awarded twice, even if an approval is retried.
-- Deleting an account deletes its rows (cascade); nothing else deletes or edits one.
create table trailmark_event (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  action text not null check (action in ('new_trail', 'trail_photos', 'trail_report', 'condition_confirmed', 'place_contribution', 'correction')),
  points integer not null check (points > 0),
  ref_type text not null check (ref_type in ('submission', 'trail_report', 'condition_report', 'media', 'place')),
  ref_id uuid not null,
  -- The trail it was about, when there is one: used only to filter a leaderboard by district or state.
  trail_id uuid references trail(id) on delete set null,
  awarded_at timestamptz not null default now(),
  unique (action, ref_type, ref_id)
);
create index trailmark_event_user_idx on trailmark_event (user_id, awarded_at desc);
create index trailmark_event_cap_idx on trailmark_event (user_id, action, awarded_at desc);

create function trailmark_event_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'trailmark_event is append-only';
end $$;
create trigger trailmark_event_no_update before update on trailmark_event for each row execute function trailmark_event_append_only();

-- Everything below is the rider's own opt-in. Both default to off: nobody is ranked or enrolled unless they chose it.
create table rider_game_pref (
  user_id uuid primary key references app_user(id) on delete cascade,
  leaderboard_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);
create table challenge_enrolment (
  user_id uuid not null references app_user(id) on delete cascade,
  challenge_id text not null check (char_length(challenge_id) between 1 and 60),
  joined_at timestamptz not null default now(),
  primary key (user_id, challenge_id)
);

alter table trailmark_event enable row level security;
alter table rider_game_pref enable row level security;
alter table challenge_enrolment enable row level security;
revoke all on trailmark_event, rider_game_pref, challenge_enrolment from anon, authenticated;
