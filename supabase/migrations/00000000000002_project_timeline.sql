-- Phase 2: persists the current editor state per project. See
-- docs/architecture/08-timeline-json-schema.md for the full schema this is
-- a simplified subset of (Phase 2 has no effects/keyframes yet).

alter table projects add column if not exists timeline jsonb;
