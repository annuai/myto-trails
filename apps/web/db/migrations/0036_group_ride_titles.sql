-- A group ride's leader can give a rider several titles at once (captain, marshal, medic, sweep): Pranab can be the medic and the sweep.
-- `titles` is the list the leader sets. The old single `event_role` stays for an event's sign-ups; a rider the leader has edited has it
-- cleared, and the list is what everyone sees from then on. Additive: code from before this migration runs fine against it.

alter table group_ride_member add column titles text[] not null default '{}' check (titles <@ array['captain', 'marshal', 'medic', 'sweep']::text[]);
