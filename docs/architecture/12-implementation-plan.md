# Implementation Plan

This is the authoritative phase boundary for the project. **Status markers are honest,
not aspirational** — a phase marked "Built" was actually written, typechecked, linted,
and verified against real local infrastructure (Postgres, Redis, ffmpeg) in this pass;
nothing is marked built on the basis of "should work."

## Phase 1 — Foundation (this engagement, BUILT)

- Original brand ("Clippn"), design system, landing page
- Authentication code against Supabase Auth (email/password, Google OAuth, magic link,
  password reset) — written correctly against the real Supabase SDK; live-flow
  verification requires either Docker (unavailable in this sandbox) or a real Supabase
  project, see the final report for exactly what was and wasn't exercised
- Anonymous browser utility workspace
- Full database schema for the Phase-1 table set, migrated and verified via psql
  against a real local Postgres, including RLS row-isolation tests
- Private storage abstraction (local-filesystem dev implementation; Supabase
  Storage/S3-compatible production implementation)
- Application shell (sidebar, nav, no credit/plan/upgrade UI anywhere)
- Project dashboard (real CRUD)
- Video cutter + video cropper, real ffmpeg, no login required, no watermark
- Provider credential system (session-only mode) + Mock Provider, fully simulating
  success/latency/failure/rate-limit/safety-rejection/expired-credential

## Phase 2 — Local media utilities completion (NOT YET BUILT)

Video compressor, audio balancer, audio converter, video-to-audio converter, media
inspector UI (ffprobe output surfaced), basic multitrack timeline editor (video/text/
caption/audio tracks only, no effects yet), local export across all utility tools.

## Phase 3 — Real provider adapters (NOT YET BUILT)

Google Gemini adapter (including Nano Banana-class image gen/edit where available to
the connected account), OpenAI adapter, model discovery wired to real APIs, "remember
securely" envelope-encrypted persistence mode with KMS integration, capability system
fully live (not mock-only).

## Phase 4 — First AI tools (NOT YET BUILT)

Quick Subtitles, AI Voiceover, Content Brainstorm, AI Image Generator, AI Image Editor,
Icon/Avatar Generator, Speech Enhancer, Vocal/Instrumental Separator.

## Phase 5 — Primary creation workflows (NOT YET BUILT)

Auto Clip, Split-Screen Video, Reddit-style Story Video, Fictional Chat Story Video
(with disclosure metadata), Streamer Clip, Idea-to-Short, full advanced timeline
editor (effects, keyframes, multi-select, snapping, virtualization), batch rendering.

## Phase 6 — Remaining tools + templates + assets (NOT YET BUILT)

Background Remover, Subtitle Remover, Voice Changer, consent-gated Face Swap,
capability-gated AI Video tool, original template system (14 categories), full asset/
content library.

## Phase 7 — Organization and trust features (NOT YET BUILT)

Content Brief Library (non-monetary), Social Tracker (OAuth-based, official APIs only),
creator calculators, support-ticket system with secret scanning, copyright/likeness-
removal/data-deletion workflows, admin operational dashboard (metadata-only, no
credential reveal capability by construction).

## Phase 8 — Hardening (NOT YET BUILT)

Full unit/integration/E2E test suite (the 40 scenarios enumerated in the original
brief), security review pass, credential-leak review, media-worker sandbox review,
accessibility audit, performance optimization, production deployment documentation.

## Continuation model

Each subsequent phase should land the same way Phase 1 did: design docs already exist
(this directory), implementation happens in reviewably-sized commits, each verified
against real local infrastructure before being called done, closed out with an
independent adversarial review before merge. No phase should be declared complete on
the basis of code that compiles but was never actually run.
