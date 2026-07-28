-- Product direction change: Clippn has no hosted accounts, no login, and no
-- cloud backend. Each clone is a single local user running entirely on
-- their own machine. This migration removes the Supabase-Auth-shaped
-- dependency introduced in 00000000000001/00000000000002: profiles no
-- longer references a nonexistent auth.users table, and row-level security
-- (which existed to isolate tenants from each other) is dropped, since a
-- local single-user database has no other tenant to isolate from.

alter table profiles drop constraint if exists profiles_id_fkey;
alter table profiles alter column id set default gen_random_uuid();

-- Disabling RLS also drops the need for every policy created against it;
-- policies are dropped explicitly first for a clean, readable migration.

drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
drop policy if exists "profiles_delete_own" on profiles;
alter table profiles disable row level security;

drop policy if exists "user_roles_select_own" on user_roles;
alter table user_roles disable row level security;

drop policy if exists "user_preferences_select_own" on user_preferences;
drop policy if exists "user_preferences_insert_own" on user_preferences;
drop policy if exists "user_preferences_update_own" on user_preferences;
drop policy if exists "user_preferences_delete_own" on user_preferences;
alter table user_preferences disable row level security;

drop policy if exists "provider_connections_select_own" on provider_connections;
drop policy if exists "provider_connections_insert_own" on provider_connections;
drop policy if exists "provider_connections_update_own" on provider_connections;
drop policy if exists "provider_connections_delete_own" on provider_connections;
alter table provider_connections disable row level security;

drop policy if exists "provider_credentials_select_own" on provider_credentials;
drop policy if exists "provider_credentials_insert_own" on provider_credentials;
drop policy if exists "provider_credentials_update_own" on provider_credentials;
drop policy if exists "provider_credentials_delete_own" on provider_credentials;
alter table provider_credentials disable row level security;

drop policy if exists "provider_capability_snapshots_select_own" on provider_capability_snapshots;
drop policy if exists "provider_capability_snapshots_insert_own" on provider_capability_snapshots;
alter table provider_capability_snapshots disable row level security;

drop policy if exists "model_catalog_select_authenticated" on model_catalog;
alter table model_catalog disable row level security;

drop policy if exists "projects_select_own" on projects;
drop policy if exists "projects_insert_own" on projects;
drop policy if exists "projects_update_own" on projects;
drop policy if exists "projects_delete_own" on projects;
alter table projects disable row level security;

drop policy if exists "project_versions_select_own" on project_versions;
drop policy if exists "project_versions_insert_own" on project_versions;
alter table project_versions disable row level security;

drop policy if exists "project_settings_select_own" on project_settings;
drop policy if exists "project_settings_insert_own" on project_settings;
drop policy if exists "project_settings_update_own" on project_settings;
alter table project_settings disable row level security;

drop policy if exists "assets_select_own" on assets;
drop policy if exists "assets_insert_own" on assets;
drop policy if exists "assets_update_own" on assets;
drop policy if exists "assets_delete_own" on assets;
alter table assets disable row level security;

drop policy if exists "folders_select_own" on folders;
drop policy if exists "folders_insert_own" on folders;
drop policy if exists "folders_update_own" on folders;
drop policy if exists "folders_delete_own" on folders;
alter table folders disable row level security;

drop policy if exists "folder_assets_select_own" on folder_assets;
drop policy if exists "folder_assets_insert_own" on folder_assets;
drop policy if exists "folder_assets_delete_own" on folder_assets;
alter table folder_assets disable row level security;

drop policy if exists "generation_jobs_select_own" on generation_jobs;
drop policy if exists "generation_jobs_insert_own" on generation_jobs;
drop policy if exists "generation_jobs_update_own" on generation_jobs;
drop policy if exists "generation_jobs_delete_own" on generation_jobs;
alter table generation_jobs disable row level security;

drop policy if exists "render_jobs_select_own" on render_jobs;
drop policy if exists "render_jobs_insert_own" on render_jobs;
drop policy if exists "render_jobs_update_own" on render_jobs;
drop policy if exists "render_jobs_delete_own" on render_jobs;
alter table render_jobs disable row level security;

drop policy if exists "consent_attestations_select_own" on consent_attestations;
drop policy if exists "consent_attestations_insert_own" on consent_attestations;
alter table consent_attestations disable row level security;

alter table audit_logs disable row level security;

drop policy if exists "feature_flags_select_authenticated" on feature_flags;
alter table feature_flags disable row level security;
