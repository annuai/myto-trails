-- Club search and paging. The club list used to be cut at the newest 100, so older clubs could not be found. Searching matches the
-- name or the description (case-insensitive, anywhere in the text), which the trigram indexes keep fast with thousands of clubs; the
-- listing index serves the newest-first order the pages are read in.

create extension if not exists pg_trgm;

create index club_name_trgm_idx on club using gin (name gin_trgm_ops) where archived_at is null;
create index club_description_trgm_idx on club using gin (description gin_trgm_ops) where archived_at is null;
create index club_listing_idx on club (created_at desc, id desc) where archived_at is null;
