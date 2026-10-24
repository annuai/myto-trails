-- Core schema (docs/06-data-model.md, M1 subset). Vocabularies are CHECK constraints so they can evolve with plain migrations.

create table region (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references region (id),
  kind text not null check (kind in ('country', 'state', 'district')),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  unique nulls not distinct (parent_id, slug)
);

create table trail (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  region_id uuid not null references region (id),
  state_id uuid not null references region (id),
  published_revision_id uuid,
  lifecycle text not null default 'draft' check (lifecycle in ('draft', 'in_review', 'published', 'unpublished', 'archived')),
  sensitivity text not null default 'standard' check (sensitivity in ('standard', 'sensitive', 'restricted_geometry')),
  is_sample boolean not null default false,
  public_point geography (point, 4326),
  access_class_current text not null default 'unknown',
  access_verification_level_current text not null default 'unverified',
  access_verified_until date,
  condition_current text not null default 'unknown',
  created_at timestamptz not null default now(),
  first_published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table trail_revision (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references trail (id) on delete cascade,
  version_no integer not null check (version_no >= 1),
  state text not null default 'draft' check (state in ('draft', 'submitted', 'changes_requested', 'approved', 'rejected', 'superseded')),
  name text not null check (char_length(name) between 3 and 80),
  summary text not null check (char_length(summary) between 40 and 400),
  description text check (description is null or char_length(description) <= 5000),
  nearest_town text not null,
  start_point geography (point, 4326) not null
    check (st_x(start_point::geometry) between 68 and 98 and st_y(start_point::geometry) between 6 and 37),
  route_shape text check (route_shape in ('loop', 'out_and_back', 'point_to_point')),
  distance_km numeric(7, 1) check (distance_km is null or distance_km > 0),
  est_duration_min integer check (est_duration_min is null or est_duration_min > 0),
  elevation_gain_m integer check (elevation_gain_m is null or elevation_gain_m >= 0),
  difficulty text not null check (difficulty in ('easy', 'moderate', 'hard', 'expert')),
  terrain text[] not null
    check (cardinality(terrain) >= 1 and terrain <@ array['dirt', 'gravel', 'mud', 'sand', 'rock', 'forest_track', 'mountain_road', 'riverbed', 'mixed']),
  suitable_for text[] not null default '{}'
    check (suitable_for <@ array['adventure_tourer', 'dual_sport', 'enduro', 'scrambler', 'small_displacement', 'any']),
  best_months integer[] not null default '{}' check (best_months <@ array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
  season_notes text,
  hazards text[] not null default '{}'
    check (hazards <@ array['slippery_after_rain', 'river_crossing', 'steep_descent', 'loose_rock', 'wildlife', 'no_mobile_signal', 'no_fuel', 'low_branches']),
  safety_notes text,
  surface_notes text,
  contributor_credit text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trail_id, version_no)
);

alter table trail add constraint trail_published_revision_fk foreign key (published_revision_id) references trail_revision (id);

create table access_assessment (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references trail (id) on delete cascade,
  access_class text not null check (access_class in ('public', 'permission_required', 'private_no_access', 'restricted', 'unknown')),
  restrictions text[] not null default '{}'
    check (restrictions <@ array['forest_dept', 'protected_area', 'private_estate', 'seasonal_ban', 'permit', 'no_motor_vehicles']),
  permission_instructions text,
  permission_contact text,
  basis text not null check (basis in ('official_notice', 'owner_confirmed', 'authority_confirmed', 'rider_observed', 'map_data', 'none')),
  level text not null check (level in ('officially_verified', 'moderator_verified', 'community_reported', 'unverified')),
  verified_at date,
  valid_until date,
  notes text,
  created_at timestamptz not null default clock_timestamp(),
  check (valid_until is null or verified_at is null or valid_until > verified_at)
);

create table evidence (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references access_assessment (id) on delete cascade,
  kind text not null check (kind in ('official_document', 'written_confirmation', 'signage_photo', 'url', 'call_note', 'other')),
  description text not null,
  url text
);

create table condition_event (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references trail (id) on delete cascade,
  status text not null check (status in ('open', 'temporarily_closed', 'permanently_closed', 'seasonal', 'unknown')),
  reason text check (reason in ('weather', 'landslide', 'construction', 'private_closure', 'regulatory', 'unknown', 'other')),
  effective_from date not null,
  expected_until date,
  note text,
  source text not null check (source in ('moderator', 'report', 'official', 'contributor')),
  recorded_at timestamptz not null default clock_timestamp()
);

create table media (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references trail_revision (id) on delete cascade,
  role text not null check (role in ('cover', 'gallery')),
  position integer not null default 0,
  caption text check (caption is null or char_length(caption) <= 160),
  alt_text text not null,
  credit text,
  variants jsonb not null default '{}',
  width integer,
  height integer
);

create index trail_state_idx on trail (state_id);
create index trail_region_idx on trail (region_id);
create index trail_public_point_idx on trail using gist (public_point);
create index trail_revision_start_idx on trail_revision using gist (start_point);
create index trail_revision_name_trgm_idx on trail_revision using gin (name gin_trgm_ops);
create index access_assessment_trail_idx on access_assessment (trail_id, created_at desc);
create index condition_event_trail_idx on condition_event (trail_id, effective_from desc);
create index evidence_assessment_idx on evidence (assessment_id);
create index media_revision_idx on media (revision_id, position);
