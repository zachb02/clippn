-- Row Level Security for every Phase 1 table, per docs/architecture/11-security-model.md.
-- Uniform pattern for directly user-owned tables: auth.uid() = user_id.
-- Tables reached only through a parent are scoped via a join back to the
-- owning row's user_id rather than duplicating the column.

-- ── profiles (keyed by id, not user_id) ─────────────────────────────────

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);
create policy "profiles_delete_own" on profiles
  for delete using (auth.uid() = id);

-- ── user_roles ───────────────────────────────────────────────────────────
-- Users may read their own roles; only a service role assigns/revokes them.

alter table user_roles enable row level security;

create policy "user_roles_select_own" on user_roles
  for select using (auth.uid() = user_id);

-- ── user_preferences ─────────────────────────────────────────────────────

alter table user_preferences enable row level security;

create policy "user_preferences_select_own" on user_preferences
  for select using (auth.uid() = user_id);
create policy "user_preferences_insert_own" on user_preferences
  for insert with check (auth.uid() = user_id);
create policy "user_preferences_update_own" on user_preferences
  for update using (auth.uid() = user_id);
create policy "user_preferences_delete_own" on user_preferences
  for delete using (auth.uid() = user_id);

-- ── provider_connections ─────────────────────────────────────────────────

alter table provider_connections enable row level security;

create policy "provider_connections_select_own" on provider_connections
  for select using (auth.uid() = user_id);
create policy "provider_connections_insert_own" on provider_connections
  for insert with check (auth.uid() = user_id);
create policy "provider_connections_update_own" on provider_connections
  for update using (auth.uid() = user_id);
create policy "provider_connections_delete_own" on provider_connections
  for delete using (auth.uid() = user_id);

-- ── provider_credentials ─────────────────────────────────────────────────
-- Scoped via join to provider_connections. No column here is ever selected
-- by any client-facing query, but RLS is still the backstop: even a bug in
-- application code cannot return another user's ciphertext.

alter table provider_credentials enable row level security;

create policy "provider_credentials_select_own" on provider_credentials
  for select using (
    exists (
      select 1 from provider_connections pc
      where pc.id = provider_credentials.connection_id
        and pc.user_id = auth.uid()
    )
  );
create policy "provider_credentials_insert_own" on provider_credentials
  for insert with check (
    exists (
      select 1 from provider_connections pc
      where pc.id = provider_credentials.connection_id
        and pc.user_id = auth.uid()
    )
  );
create policy "provider_credentials_update_own" on provider_credentials
  for update using (
    exists (
      select 1 from provider_connections pc
      where pc.id = provider_credentials.connection_id
        and pc.user_id = auth.uid()
    )
  );
create policy "provider_credentials_delete_own" on provider_credentials
  for delete using (
    exists (
      select 1 from provider_connections pc
      where pc.id = provider_credentials.connection_id
        and pc.user_id = auth.uid()
    )
  );

-- ── provider_capability_snapshots ────────────────────────────────────────

alter table provider_capability_snapshots enable row level security;

create policy "provider_capability_snapshots_select_own" on provider_capability_snapshots
  for select using (
    exists (
      select 1 from provider_connections pc
      where pc.id = provider_capability_snapshots.connection_id
        and pc.user_id = auth.uid()
    )
  );
create policy "provider_capability_snapshots_insert_own" on provider_capability_snapshots
  for insert with check (
    exists (
      select 1 from provider_connections pc
      where pc.id = provider_capability_snapshots.connection_id
        and pc.user_id = auth.uid()
    )
  );

-- ── model_catalog ─────────────────────────────────────────────────────────
-- Shared reference data, not user-owned. Readable by any authenticated user.

alter table model_catalog enable row level security;

create policy "model_catalog_select_authenticated" on model_catalog
  for select using (auth.uid() is not null);

-- ── projects ─────────────────────────────────────────────────────────────

alter table projects enable row level security;

create policy "projects_select_own" on projects
  for select using (auth.uid() = user_id);
create policy "projects_insert_own" on projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on projects
  for update using (auth.uid() = user_id);
create policy "projects_delete_own" on projects
  for delete using (auth.uid() = user_id);

-- ── project_versions ─────────────────────────────────────────────────────

alter table project_versions enable row level security;

create policy "project_versions_select_own" on project_versions
  for select using (
    exists (
      select 1 from projects p
      where p.id = project_versions.project_id
        and p.user_id = auth.uid()
    )
  );
create policy "project_versions_insert_own" on project_versions
  for insert with check (
    exists (
      select 1 from projects p
      where p.id = project_versions.project_id
        and p.user_id = auth.uid()
    )
  );

-- ── project_settings ─────────────────────────────────────────────────────

alter table project_settings enable row level security;

create policy "project_settings_select_own" on project_settings
  for select using (
    exists (
      select 1 from projects p
      where p.id = project_settings.project_id
        and p.user_id = auth.uid()
    )
  );
create policy "project_settings_insert_own" on project_settings
  for insert with check (
    exists (
      select 1 from projects p
      where p.id = project_settings.project_id
        and p.user_id = auth.uid()
    )
  );
create policy "project_settings_update_own" on project_settings
  for update using (
    exists (
      select 1 from projects p
      where p.id = project_settings.project_id
        and p.user_id = auth.uid()
    )
  );

-- ── assets ───────────────────────────────────────────────────────────────

alter table assets enable row level security;

create policy "assets_select_own" on assets
  for select using (auth.uid() = user_id);
create policy "assets_insert_own" on assets
  for insert with check (auth.uid() = user_id);
create policy "assets_update_own" on assets
  for update using (auth.uid() = user_id);
create policy "assets_delete_own" on assets
  for delete using (auth.uid() = user_id);

-- ── folders ──────────────────────────────────────────────────────────────

alter table folders enable row level security;

create policy "folders_select_own" on folders
  for select using (auth.uid() = user_id);
create policy "folders_insert_own" on folders
  for insert with check (auth.uid() = user_id);
create policy "folders_update_own" on folders
  for update using (auth.uid() = user_id);
create policy "folders_delete_own" on folders
  for delete using (auth.uid() = user_id);

-- ── folder_assets ────────────────────────────────────────────────────────

alter table folder_assets enable row level security;

create policy "folder_assets_select_own" on folder_assets
  for select using (
    exists (
      select 1 from folders f
      where f.id = folder_assets.folder_id
        and f.user_id = auth.uid()
    )
  );
create policy "folder_assets_insert_own" on folder_assets
  for insert with check (
    exists (
      select 1 from folders f
      where f.id = folder_assets.folder_id
        and f.user_id = auth.uid()
    )
  );
create policy "folder_assets_delete_own" on folder_assets
  for delete using (
    exists (
      select 1 from folders f
      where f.id = folder_assets.folder_id
        and f.user_id = auth.uid()
    )
  );

-- ── generation_jobs ──────────────────────────────────────────────────────

alter table generation_jobs enable row level security;

create policy "generation_jobs_select_own" on generation_jobs
  for select using (auth.uid() = user_id);
create policy "generation_jobs_insert_own" on generation_jobs
  for insert with check (auth.uid() = user_id);
create policy "generation_jobs_update_own" on generation_jobs
  for update using (auth.uid() = user_id);
create policy "generation_jobs_delete_own" on generation_jobs
  for delete using (auth.uid() = user_id);

-- ── render_jobs ──────────────────────────────────────────────────────────

alter table render_jobs enable row level security;

create policy "render_jobs_select_own" on render_jobs
  for select using (auth.uid() = user_id);
create policy "render_jobs_insert_own" on render_jobs
  for insert with check (auth.uid() = user_id);
create policy "render_jobs_update_own" on render_jobs
  for update using (auth.uid() = user_id);
create policy "render_jobs_delete_own" on render_jobs
  for delete using (auth.uid() = user_id);

-- ── consent_attestations ─────────────────────────────────────────────────
-- Immutable by policy: select + insert only, deliberately no update/delete
-- for any role (a consent record must never be edited or removed later).

alter table consent_attestations enable row level security;

create policy "consent_attestations_select_own" on consent_attestations
  for select using (auth.uid() = user_id);
create policy "consent_attestations_insert_own" on consent_attestations
  for insert with check (auth.uid() = user_id);

-- ── audit_logs ───────────────────────────────────────────────────────────
-- Not user-selectable at all. Only the service role (which bypasses RLS)
-- reads or writes this table; no policy is defined for regular users, so
-- RLS with zero policies denies all access by default.

alter table audit_logs enable row level security;

-- ── feature_flags ────────────────────────────────────────────────────────
-- Shared config, not user-owned. Readable by any authenticated user.

alter table feature_flags enable row level security;

create policy "feature_flags_select_authenticated" on feature_flags
  for select using (auth.uid() is not null);
