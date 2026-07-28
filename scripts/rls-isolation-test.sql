-- LOCAL TEST ONLY. Verifies RLS row isolation using scripts/local-auth-stub.sql.
-- Run as a non-superuser role -- Postgres superusers bypass RLS entirely,
-- which would make this test pass even if the policies were broken.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end
$$;
grant usage on schema public, auth to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant select, insert, update, delete on auth.users to app_user;
grant execute on function auth.uid() to app_user;

-- Everything below runs as app_user inside a transaction that always rolls
-- back, so this script is safe to re-run against a live dev database.
begin;
set local role app_user;

-- Seed two users and one project each, run as user A so both inserts are
-- legitimately "their own row" at write time.
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) as as_user_a;
insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111') on conflict do nothing;
insert into profiles (id, display_name) values ('11111111-1111-1111-1111-111111111111', 'User A');
insert into projects (user_id, title) values ('11111111-1111-1111-1111-111111111111', 'User A Project');

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) as as_user_b;
insert into auth.users (id) values ('22222222-2222-2222-2222-222222222222') on conflict do nothing;
insert into profiles (id, display_name) values ('22222222-2222-2222-2222-222222222222', 'User B');
insert into projects (user_id, title) values ('22222222-2222-2222-2222-222222222222', 'User B Project');

\echo '--- TEST 1: User A should see ONLY their own project ---'
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) as as_user_a;
select user_id, title from projects;

\echo '--- TEST 2: User B should see ONLY their own project ---'
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) as as_user_b;
select user_id, title from projects;

\echo '--- TEST 3: User A cannot INSERT a project claiming to be User B (should fail) ---'
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) as as_user_a;
savepoint before_forged_insert;
insert into projects (user_id, title) values ('22222222-2222-2222-2222-222222222222', 'Forged Project');
rollback to savepoint before_forged_insert;

\echo '--- TEST 4: with no simulated session (anonymous), no projects should be visible ---'
select set_config('request.jwt.claim.sub', '', false) as as_anonymous;
select count(*) as visible_to_anonymous from projects;

\echo '--- TEST 5: profiles isolation -- User B cannot read User A profile row ---'
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) as as_user_b;
select id, display_name from profiles;

\echo '--- TEST 6: audit_logs has zero policies -- confirm regular users see nothing at all ---'
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) as as_user_a;
select count(*) as visible_audit_rows from audit_logs;

\echo '--- TEST 7: provider_credentials join-based isolation ---'
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) as as_user_a;
insert into provider_connections (user_id, provider, label, storage_mode)
  values ('11111111-1111-1111-1111-111111111111', 'mock', 'A key', 'session');
insert into provider_credentials (connection_id, encrypted_data_key, encrypted_credential, nonce, auth_tag)
  select id, '\x00'::bytea, '\x00'::bytea, '\x00'::bytea, '\x00'::bytea from provider_connections where user_id = '11111111-1111-1111-1111-111111111111';

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) as as_user_b;
select count(*) as visible_credentials_to_user_b from provider_credentials;

rollback;
