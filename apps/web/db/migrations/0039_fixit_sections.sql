-- Fix it sections: the major parts of the bike (Tyres, Brakes, Drivetrain...) that guides are grouped under in the app. A section's cover is the art id
-- of one of its guides' pictures. fixit_guide.section is null for a guide not yet placed in a section; the app shows those in a last "More" group.
-- Closed to the public roles like the other Fix it tables: the application reads them through GET /api/v1/fixit.

create table fixit_section (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 2 and 40),
  cover text check (cover is null or cover ~ '^[a-z0-9]+(-[a-z0-9]+)*/[a-z0-9]+(-[a-z0-9]+)*$'),
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table fixit_guide add column section text references fixit_section (id) on update cascade on delete set null;
create index fixit_guide_section_idx on fixit_guide (section);

create trigger fixit_section_touch before update on fixit_section for each row execute function fixit_touch();

alter table fixit_section enable row level security;
revoke all on fixit_section from anon, authenticated;
