# Implementation Plan

This is the authoritative phase boundary for the project. **Status markers are honest,
not aspirational** — a phase marked "Built" was actually written, typechecked, linted,
and verified against real local infrastructure (Postgres, Redis, ffmpeg) in this pass;
nothing is marked built on the basis of "should work."

**Product direction update:** Clippn has no hosted accounts, no login, and no cloud
backend. Each clone runs entirely on the user's own machine against their own local
Postgres/Redis, with a single auto-provisioned local profile (see `src/lib/local-user.ts`
and `supabase/migrations/00000000000001_phase1_core_schema.sql`). This superseded the
original Supabase-Auth-based plan referenced in earlier drafts of this document.

## Phase 1 — Foundation (BUILT)

- Original brand ("Clippn"), design system, landing page
- No-account, no-backend architecture: single local user, direct Postgres access, no
  RLS (no other tenant to isolate from)
- Anonymous browser utility workspace
- Full database schema, migrated and verified via psql against a real local Postgres
- Local filesystem storage abstraction (`src/lib/storage/local-storage.ts`)
- Application shell (sidebar, nav, no credit/plan/upgrade UI anywhere)
- Project dashboard (real CRUD) + project detail/editor shell
- Video cutter + video cropper, real ffmpeg, no login required, no watermark
- Provider credential system (session-only and "remember securely" envelope-encrypted
  modes, both implemented and tested) + Mock Provider, fully simulating
  success/latency/failure/rate-limit/safety-rejection/expired-credential

## Phase 2 — Local media utilities completion (BUILT)

- Video compressor (CRF-based), audio balancer (loudnorm with presets), audio converter,
  video-to-audio converter, media inspector UI (full ffprobe metadata surfaced)
- Basic multitrack timeline editor: video/text/audio tracks (video and audio tracks are
  sequential -- clips play back-to-back, `startSeconds` is an ordering key, not an
  absolute timestamp; text-track clips use real absolute timing since they're
  independent overlays) — real asset upload, arrange/trim/reorder, live preview, and a
  genuine multi-step FFmpeg render pipeline (concat, `amix`, text burned in via
  sharp/SVG → `overlay`, not `drawtext`, since not every FFmpeg build has freetype
  support compiled in)
- No effects, keyframes, or absolute-position/gap-aware compositing yet — that's Phase 5

## Phase 3 — Real provider adapters (BUILT, with an honest verification gap)

- Real Google Gemini adapter (`@google/genai`) and OpenAI adapter (`openai`), both
  written and typechecked against the actual installed SDKs' type definitions
- Both implement: `validateCredential`, `discoverModels`, `getCapabilities`,
  `generateText`. OpenAI also implements `generateImage`
- **Not implemented for either real adapter:** `transcribeAudio`, `synthesizeSpeech`.
  Both need real audio bytes, but `TranscriptionInput`/`SpeechSynthesisInput` currently
  carry only a URL reference — wiring real bytes through requires extending the
  credential-resolution/asset-serving path, not yet done
- **Verification gap, stated plainly:** neither adapter has been exercised against a
  real, valid API key in this sandbox (none was available). What *was* verified: a
  syntactically-plausible but fake key was submitted for both providers and confirmed to
  produce a real network round-trip to the actual OpenAI/Gemini APIs, get rejected for
  invalid auth, and get caught and normalized into a clean error response rather than
  crashing. The success path (valid key → real generated output) needs the user's own
  key to confirm.
- "Remember securely" envelope-encrypted persistence was actually already built in
  Phase 1, ahead of this phase's original description

## Phase 4 — First AI tools (6 of 8 BUILT)

Built and verified end-to-end (real UI, real Mock Provider round-trip, in three cases a
real generated artifact landing in the project as an asset/timeline clip):

- Quick Subtitles — transcribes and drops timed captions onto the text track
- AI Voiceover — generates speech and adds it as a real audio-track asset
- Content Brainstorm — standalone hooks/titles/outline generator
- AI Image Generator — standalone prompt-to-image
- Icon/Avatar Generator — same UI, framed for square icon/avatar output
- AI Image Editor — upload an image client-side (base64 data URL, never a
  server-fetched remote URL -- deliberately sidesteps the SSRF surface a
  user-supplied fetch URL would open), describe an edit, real OpenAI
  `images.edit` call (Mock Provider also implements it). Verified against
  the real OpenAI API with a fake key (clean, normalized 401 rather than
  a crash) and against the non-data-URL rejection path
- Speech Enhancer — real FFmpeg FFT noise reduction (`afftdn` + high-pass), not
  provider-dependent, lives with the local tools instead

Also fixed in this pass: the image-generator and icon-generator routes were hardcoding
`modelId: "mock-full"` for every provider, including real OpenAI connections -- harmless
against the Mock Provider (whose model IDs are exactly `mock-full`/`mock-text-only`) but
a live break for a real OpenAI credential, since `"mock-full"` isn't a real OpenAI model.
Both routes now resolve a real per-provider default via `src/lib/ai/default-models.ts`.

**Not yet built:** Vocal/Instrumental Separator (genuine stem separation needs a real ML
model like Demucs — nothing in this stack does that yet, and faking it with an EQ pass
would be dishonest, so it stays unbuilt rather than approximated).

## Phase 5 — Primary creation workflows (NOT YET BUILT)

Auto Clip, Split-Screen Video, Reddit-style Story Video, Fictional Chat Story Video
(with disclosure metadata), Streamer Clip, Idea-to-Short, full advanced timeline
editor (effects, keyframes, multi-select, snapping, virtualization, absolute-position/
gap-aware compositing), batch rendering.

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

Each subsequent phase should land the same way Phases 1-4 did: implementation happens
in reviewably-sized commits, each verified against real local infrastructure before
being called done, closed out with an independent adversarial review before merge (six
review rounds so far across this project, each with real findings, all fixed and
re-verified — see git history). No phase should be declared complete on the basis of
code that compiles but was never actually run.
