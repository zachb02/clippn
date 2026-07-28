-- LOCAL DEVELOPMENT / TEST ONLY. Never run against a real Supabase project
-- (Supabase already provides the real auth.users table and auth.uid()
-- function via its Auth extension). This stub exists only so the Phase 1
-- migrations and RLS policies -- which are written to target real Supabase
-- Postgres -- can be verified for real against a bare local Postgres
-- instance in this sandbox, where no Supabase stack is running.
--
-- Usage: psql -d clipforge_dev -f scripts/local-auth-stub.sql
-- Then, per session/connection, simulate a logged-in user with:
--   select set_config('request.jwt.claim.sub', '<uuid>', false);

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid()
);

create or replace function auth.uid() returns uuid as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$ language sql stable;
