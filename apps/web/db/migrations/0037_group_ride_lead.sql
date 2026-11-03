-- Passing the lead of a group ride.
--  successor_id        the leader's backup: who takes over if their phone dies. Chosen by the leader; cleared whenever the lead changes hands.
--  previous_leader_id  who had the lead taken from them because they dropped off, so they can take it back when they return in one tap.
--  battery, charging   a rider's last reported battery level, so the server can tell a phone that has died (it went quiet at 4%) from one that has
--                      only lost its signal (it went quiet at 60%). Nobody else reads it; it goes when the rider leaves or the ride ends.
-- Additive: code from before this migration runs fine against it.

alter table group_ride add column successor_id uuid references app_user (id) on delete set null;
alter table group_ride add column previous_leader_id uuid references app_user (id) on delete set null;
alter table group_ride_member add column battery smallint check (battery between 0 and 100);
alter table group_ride_member add column charging boolean not null default false;
