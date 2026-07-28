-- Clippn Phase 1 core schema.
-- Clippn has no hosted backend and no accounts: every clone runs against
-- its own local Postgres, with a single local-user row auto-provisioned by
-- the app (see src/lib/local-user.ts). There is no auth.users table and no
-- row-level security -- a local single-user database has no other tenant
-- to isolate from.

create extension if not exists pgcrypto;

-- ── Identity ─────────────────────────────────────────────────────────────

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('user', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index if not exists user_roles_user_idx on user_roles (user_id);

create table if not exists user_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  reduced_motion boolean not null default false,
  default_language text not null default 'en',
  updated_at timestamptz not null default now()
);

-- ── Provider connections (BYOK credential vault) ────────────────────────

create table if not exists provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  provider text not null check (provider in ('google-gemini', 'openai', 'mock')),
  label text not null,
  storage_mode text not null check (storage_mode in ('session', 'remembered')),
  status text not null default 'not_connected' check (status in (
    'not_connected', 'testing', 'connected', 'invalid', 'expired',
    'permission_denied', 'provider_unavailable', 'rate_limited',
    'model_unavailable', 'reconnect_required'
  )),
  masked_ending text,
  expires_at timestamptz,
  last_validated_at timestamptz,
  last_used_at timestamptz,
  default_text_model text,
  default_image_model text,
  default_transcription_model text,
  default_speech_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists provider_connections_user_idx on provider_connections (user_id);

-- "Remembered" mode only. Session-only credentials never reach this table -
-- they live in a short-lived server-side secret store, not Postgres.
create table if not exists provider_credentials (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references provider_connections(id) on delete cascade,
  encrypted_data_key bytea not null,
  encrypted_credential bytea not null,
  encryption_algorithm text not null default 'aes-256-gcm',
  key_version int not null default 1,
  nonce bytea not null,
  auth_tag bytea not null,
  created_at timestamptz not null default now()
);
create index if not exists provider_credentials_connection_idx on provider_credentials (connection_id);
-- No column here is ever selected by any client-facing query or admin view --
-- enforced by never writing an application code path that reads this table
-- outside the credential-resolution service (no RLS: single local user).

create table if not exists provider_capability_snapshots (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references provider_connections(id) on delete cascade,
  model_id text,
  capabilities jsonb not null default '[]'::jsonb,
  discovered_at timestamptz not null default now()
);
create index if not exists provider_capability_snapshots_connection_idx
  on provider_capability_snapshots (connection_id);

create table if not exists model_catalog (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model_id text not null,
  display_name text,
  capabilities jsonb not null default '[]'::jsonb,
  deprecated boolean not null default false,
  unique (provider, model_id)
);

-- ── Projects ─────────────────────────────────────────────────────────────

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  workflow text not null default 'manual' check (workflow in (
    'auto-clip', 'split-screen', 'story', 'chat', 'streamer',
    'idea-to-short', 'quick-subtitles', 'manual'
  )),
  title text not null,
  status text not null default 'draft' check (status in (
    'draft', 'uploading', 'transcribing', 'generating', 'editing',
    'ready_to_render', 'rendering', 'completed', 'failed', 'archived'
  )),
  aspect_ratio text,
  duration_seconds numeric check (duration_seconds is null or duration_seconds >= 0),
  thumbnail_asset_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_idx on projects (user_id, updated_at desc);
create index if not exists projects_status_idx on projects (user_id, status);

create table if not exists project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  label text,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists project_versions_project_idx on project_versions (project_id, created_at desc);

create table if not exists project_settings (
  project_id uuid primary key references projects(id) on delete cascade,
  target_platform text,
  brand_preset jsonb,
  updated_at timestamptz not null default now()
);

-- ── Assets ───────────────────────────────────────────────────────────────

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  kind text not null check (kind in (
    'video', 'image', 'audio', 'music', 'sound_effect', 'voiceover',
    'generated_image', 'background', 'logo', 'font_reference', 'template',
    'transcript'
  )),
  storage_path text not null,
  original_filename text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  duration_seconds numeric check (duration_seconds is null or duration_seconds >= 0),
  width int check (width is null or width > 0),
  height int check (height is null or height > 0),
  checksum_sha256 text,
  source text not null default 'upload' check (source in ('upload', 'import', 'generated')),
  source_url text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists assets_user_idx on assets (user_id);
create index if not exists assets_project_idx on assets (project_id);
create index if not exists assets_checksum_idx on assets (user_id, checksum_sha256);

alter table projects
  add constraint projects_thumbnail_asset_fk
  foreign key (thumbnail_asset_id) references assets(id) on delete set null;

create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  parent_folder_id uuid references folders(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists folders_user_idx on folders (user_id);

create table if not exists folder_assets (
  folder_id uuid not null references folders(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (folder_id, asset_id)
);

-- ── Jobs ─────────────────────────────────────────────────────────────────

create table if not exists generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  job_type text not null check (job_type in (
    'transcription', 'clip_analysis', 'image', 'voiceover',
    'audio_enhancement', 'stem_separation', 'background_removal',
    'subtitle_removal', 'face_swap', 'video_generation'
  )),
  provider_connection_id uuid references provider_connections(id) on delete set null,
  status text not null default 'pending' check (status in (
    'pending', 'validating', 'queued', 'processing', 'waiting_for_provider',
    'downloading', 'finalizing', 'completed', 'failed', 'rejected',
    'cancelled', 'expired', 'reconnect_required'
  )),
  idempotency_key text not null unique,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error_category text,
  progress numeric not null default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists generation_jobs_user_idx on generation_jobs (user_id, created_at desc);
create index if not exists generation_jobs_project_idx on generation_jobs (project_id);
create index if not exists generation_jobs_status_idx on generation_jobs (status);

create table if not exists render_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  render_spec jsonb not null,
  status text not null default 'pending' check (status in (
    'pending', 'validating', 'queued', 'processing', 'finalizing',
    'completed', 'failed', 'cancelled', 'expired'
  )),
  idempotency_key text not null unique,
  output_asset_id uuid references assets(id) on delete set null,
  error_category text,
  progress numeric not null default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists render_jobs_user_idx on render_jobs (user_id, created_at desc);
create index if not exists render_jobs_project_idx on render_jobs (project_id);

-- ── Consent, audit, flags ────────────────────────────────────────────────

create table if not exists consent_attestations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  kind text not null check (kind in ('face_swap', 'likeness_use', 'rights_import', 'fictional_chat')),
  statement_version text not null,
  statement_text text not null,
  source_asset_ids uuid[] not null default '{}',
  accepted_at timestamptz not null default now()
);
create index if not exists consent_attestations_user_idx on consent_attestations (user_id);
-- Intended to be immutable: application code should never expose an
-- update/delete path for this table (no RLS to enforce it separately --
-- single local user, no other tenant to protect against).

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references profiles(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_actor_idx on audit_logs (actor_user_id, created_at desc);

create table if not exists feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);
