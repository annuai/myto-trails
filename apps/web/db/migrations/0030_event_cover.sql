-- An event's own cover image: a row in media, uploaded by the host through the usual upload flow, like a club's cover.
-- A club event without one shows the club's cover instead (resolved when the event is read, not stored here).
alter table ride_event add column cover_media_id uuid references media (id) on delete set null;
