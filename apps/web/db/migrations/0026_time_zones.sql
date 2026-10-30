-- A ride or check-in is shown in the time zone it happens in, not the viewer's. Existing rows are India's.
alter table ride_checkin add column time_zone text not null default 'Asia/Kolkata' check (char_length(time_zone) between 1 and 64);
alter table club_post add column time_zone text not null default 'Asia/Kolkata' check (char_length(time_zone) between 1 and 64);
