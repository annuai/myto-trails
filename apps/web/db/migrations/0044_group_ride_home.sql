-- A rider can tell their group ride they got home. Only the moment is kept (a position never is, and leaving still wipes it), so the
-- others see "Home" against the name instead of a rider who has simply gone quiet. It is cleared if the rider joins again.
alter table group_ride_member add column home_at timestamptz;
