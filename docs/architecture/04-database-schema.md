# Database Schema

Postgres (Supabase in production). UUID primary keys throughout (`gen_random_uuid()`).
Every user-owned table carries `user_id uuid references profiles(id) on delete cascade`
and is **private by default** via Row Level Security — see `11-security-model.md` for
the policy pattern applied uniformly.

No table on the banned list (`subscriptions`, `plans`, `prices`, `products`, `invoices`,
`payments`, `credit_wallets`, `credit_transactions`, `entitlements`, `checkout_sessions`,
`affiliate_payouts`, `campaign_payouts`) exists anywhere in this schema, now or in any
future phase.

**Built in Phase 1** (real migrations, verified against local Postgres): `profiles`,
`user_roles`, `user_preferences`, `provider_connections`, `provider_credentials`,
`provider_capability_snapshots`, `model_catalog`, `projects`, `project_versions`,
`project_settings`, `assets`, `folders`, `folder_assets`, `generation_jobs`,
`render_jobs`, `consent_attestations`, `audit_logs`, `feature_flags`.

**Designed, migrated in later phases**: `asset_metadata`, `asset_licenses`,
`transcripts`, `transcript_segments`, `speakers`, `scripts`, `voiceovers`,
`caption_tracks`, `caption_segments`, `timelines`, `timeline_tracks`, `timeline_clips`,
`templates`, `template_versions`, `rendered_assets`, `content_briefs`, `brief_assets`,
`brief_submissions`, `social_connections`, `social_accounts`, `social_posts`,
`social_metric_snapshots`, `moderation_events`, `account_strikes`, `support_tickets`,
`copyright_requests`, `likeness_removal_requests`, `data_deletion_requests`,
`provider_events`.

## Core identity

```
profiles
  id uuid pk references auth.users(id) on delete cascade
  display_name text
  avatar_url text
  created_at, updated_at timestamptz

user_roles
  id uuid pk
  user_id uuid fk -> profiles
  role text check (role in ('user','moderator','admin'))
  unique (user_id, role)

user_preferences
  user_id uuid pk fk -> profiles
  theme text check (theme in ('light','dark','system')) default 'system'
  reduced_motion boolean default false
  default_language text default 'en'
  updated_at timestamptz
```

## Provider connections (BYOK credential vault)

```
provider_connections
  id uuid pk
  user_id uuid fk -> profiles
  provider text check (provider in ('google-gemini','openai','mock'))
  label text not null
  storage_mode text check (storage_mode in ('session','remembered'))
  status text check (status in
    ('not_connected','testing','connected','invalid','expired',
     'permission_denied','provider_unavailable','rate_limited',
     'model_unavailable','reconnect_required'))
  masked_ending text          -- last 4 chars only, display use
  expires_at timestamptz      -- session-only credentials
  last_validated_at timestamptz
  last_used_at timestamptz
  default_text_model text
  default_image_model text
  default_transcription_model text
  default_speech_model text
  created_at, updated_at timestamptz

provider_credentials
  id uuid pk
  connection_id uuid fk -> provider_connections on delete cascade
  -- envelope encryption fields, "remembered" mode only; "session" mode never
  -- reaches this table, see 06-credential-threat-model.md
  encrypted_data_key bytea not null      -- DEK wrapped by KMS/master key
  encrypted_credential bytea not null    -- credential encrypted under DEK (AEAD)
  encryption_algorithm text not null default 'aes-256-gcm'
  key_version int not null default 1     -- for KMS key rotation
  nonce bytea not null
  auth_tag bytea not null
  created_at timestamptz
  -- NOTE: no column, view, or function in this table is ever exposed to any
  -- client or admin read path. See RLS + application-layer guarantees.

provider_capability_snapshots
  id uuid pk
  connection_id uuid fk -> provider_connections on delete cascade
  model_id text
  capabilities jsonb not null   -- ProviderCapabilities, see 05
  discovered_at timestamptz

model_catalog
  id uuid pk
  provider text
  model_id text
  display_name text
  capabilities jsonb
  deprecated boolean default false
  unique (provider, model_id)
```

## Projects and versioning

```
projects
  id uuid pk
  user_id uuid fk -> profiles
  workflow text  -- 'auto-clip' | 'split-screen' | 'story' | 'chat' | 'streamer' |
                 -- 'idea-to-short' | 'quick-subtitles' | 'manual'
  title text not null
  status text check (status in
    ('draft','uploading','transcribing','generating','editing',
     'ready_to_render','rendering','completed','failed','archived'))
  aspect_ratio text
  duration_seconds numeric
  thumbnail_asset_id uuid fk -> assets
  created_at, updated_at timestamptz

project_versions
  id uuid pk
  project_id uuid fk -> projects on delete cascade
  label text
  snapshot jsonb not null  -- timeline spec at time of snapshot; NEVER includes
                           -- decrypted credentials (enforced at the write path)
  created_at timestamptz

project_settings
  project_id uuid pk fk -> projects on delete cascade
  target_platform text
  brand_preset jsonb
  updated_at timestamptz
```

## Assets and folders

```
assets
  id uuid pk
  user_id uuid fk -> profiles
  project_id uuid fk -> projects on delete set null
  kind text check (kind in
    ('video','image','audio','music','sound_effect','voiceover',
     'generated_image','background','logo','font_reference','template',
     'transcript'))
  storage_path text not null      -- private bucket key, never a public URL
  original_filename text
  mime_type text
  byte_size bigint
  duration_seconds numeric
  width int, height int
  checksum_sha256 text            -- duplicate detection
  source text check (source in ('upload','import','generated'))
  source_url text                 -- attribution only, never auto-fetched again
  created_at timestamptz
  deleted_at timestamptz          -- soft delete, then permanent purge job

folders
  id uuid pk
  user_id uuid fk -> profiles
  name text not null
  parent_folder_id uuid fk -> folders

folder_assets
  folder_id uuid fk -> folders on delete cascade
  asset_id uuid fk -> assets on delete cascade
  primary key (folder_id, asset_id)
```

## Jobs

```
generation_jobs
  id uuid pk
  user_id uuid fk -> profiles
  project_id uuid fk -> projects on delete cascade
  job_type text check (job_type in
    ('transcription','clip_analysis','image','voiceover',
     'audio_enhancement','stem_separation','background_removal',
     'subtitle_removal','face_swap','video_generation'))
  provider_connection_id uuid fk -> provider_connections  -- id only, never a key
  status text check (status in
    ('pending','validating','queued','processing','waiting_for_provider',
     'downloading','finalizing','completed','failed','rejected',
     'cancelled','expired','reconnect_required'))
  idempotency_key text not null unique
  input jsonb not null            -- safe identifiers only (asset ids, params)
  output jsonb                    -- safe identifiers only (result asset ids)
  error_category text
  progress numeric default 0
  created_at, updated_at timestamptz

render_jobs
  id uuid pk
  user_id uuid fk -> profiles
  project_id uuid fk -> projects on delete cascade
  render_spec jsonb not null       -- see 08-render-spec-schema.md
  status text check (status in
    ('pending','validating','queued','processing','finalizing',
     'completed','failed','cancelled','expired'))
  idempotency_key text not null unique
  output_asset_id uuid fk -> assets
  error_category text
  progress numeric default 0
  created_at, updated_at timestamptz
```

## Consent, moderation, audit, flags

```
consent_attestations
  id uuid pk
  user_id uuid fk -> profiles
  project_id uuid fk -> projects
  kind text check (kind in ('face_swap','likeness_use','rights_import','fictional_chat'))
  statement_version text not null
  statement_text text not null    -- immutable copy of what was shown
  source_asset_ids uuid[] 
  accepted_at timestamptz not null
  -- immutable: no update policy defined, only insert + select

audit_logs
  id uuid pk
  actor_user_id uuid fk -> profiles
  action text not null
  target_table text
  target_id uuid
  metadata jsonb           -- safe fields only, redaction enforced at write time
  created_at timestamptz

feature_flags
  key text pk
  enabled boolean default false
  description text
  updated_at timestamptz
```

## Later-phase tables (schema sketch, not yet migrated)

Transcripts/captions/timeline tables follow the shapes in `07-timeline-json-schema.md`;
social tables mirror OAuth-token-encrypted patterns identical to `provider_credentials`;
briefs/support/copyright/likeness-removal/data-deletion tables are simple
workflow-status tables with no monetary fields whatsoever.
