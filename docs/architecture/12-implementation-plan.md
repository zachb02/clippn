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
  `generateText`. OpenAI also implements `generateImage`, `editImage`, and
  `transcribeAudio` (via `whisper-1`, added in Phase 4 -- see below)
- **Not implemented for either real adapter:** `synthesizeSpeech`. Needs real audio
  bytes out, not in, and there's no local-file destination wired for it yet
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

- Quick Subtitles — transcribes and drops timed captions onto the text track. Now wired
  to real OpenAI Whisper transcription: the route resolves the asset's real local file
  through `resolveStoragePath` (never a raw user-supplied path) and reads it directly,
  since this is a local-only app with no separate worker process to stream bytes to.
  Previously this route passed `asset.original_filename ?? assetId` as `audioUrl`, which
  wasn't a resolvable path at all -- harmless against the Mock Provider (which ignores
  the value) but meant transcription could never have worked against a real provider.
  Fixed in the same pass that added real `transcribeAudio` to the OpenAI adapter
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

## Phase 5 — Primary creation workflows (Auto Clip BUILT, rest NOT YET BUILT)

**Auto Clip** — the flagship workflow, built and verified end-to-end for real:
`POST /api/auto-clip` accepts an uploaded long-form video + a provider connection, then:
1. Real ffprobe validation (`inspectMedia`) of the actual uploaded bytes.
2. Saves the source as a real project asset (creates a project with `workflow: 'auto-clip'`).
3. Real transcription of the actual video (OpenAI Whisper directly accepts mp4 -- no audio
   extraction step needed) via the same adapter built in Phase 3/4.
4. A real `generateText` call asks the model to select up to 5 highlight ranges as strict
   JSON, defensively parsed (`src/lib/schemas/auto-clip.ts` strips markdown fences and
   validates via Zod) and clamped against the video's real duration -- a hallucinated
   out-of-range or backwards timestamp is clamped or skipped, never rendered broken.
5. Each highlight is rendered for real (`src/lib/timeline/auto-clip-render.ts`): trim to
   range, reframe to a 1080x1920 vertical canvas (scale+crop, not letterboxing), and burn in
   the *real* transcript captions overlapping that range (time-shifted to the clip's own
   local timeline) -- reusing the exact sharp/SVG + FFmpeg `overlay` technique from the
   Phase 2 timeline renderer rather than reimplementing caption compositing. Only the
   highlight *boundaries* come from the LLM; the caption *text* is always the real
   transcript, never LLM-invented.
6. Each rendered clip is verified via `inspectMedia` on its own output (not just "ffmpeg
   exited 0") and saved as a real project asset.

Also fixed as a prerequisite: `mock-provider.ts`'s `generateText` returned a generic
"Simulated response for: ..." string, which isn't valid JSON -- this would have made Auto
Clip's highlight-selection step fail even in Mock Provider mode, undermining the whole
point of Mock mode ("every capability's success... demoed with zero external dependency").
It now recognizes this prompt shape and fabricates a plausible JSON answer grounded in the
real timestamp brackets already embedded in the prompt.

Verified end-to-end: a real ffmpeg-generated 30-second synthetic video, run through the
actual browser UI (upload, connection select, Generate Clips), produced 3 real playable
1080x1920 vertical clips with real captions burned in (confirmed via ffprobe + a visual
frame-grab, not just a 201 response).

Also fixed in the same pass: Base UI's `Select.Value` renders the raw selected `value`
string by default, not the matching item's label, unless given a render-prop child or the
root's `items` map -- this silently broke the Auto Clip connection picker (showing a raw
UUID) and, it turns out, the pre-existing provider-connection form too (showing "mock"
instead of "Mock Provider..."). Both now pass an explicit render function.

**Not yet built:** Split-Screen Video, Reddit-style Story Video, Fictional Chat Story
Video (with disclosure metadata), Streamer Clip, Idea-to-Short, full advanced timeline
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
