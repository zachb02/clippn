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
  `generateText`. OpenAI also implements `generateImage`, `editImage`,
  `transcribeAudio` (via `whisper-1`, added in Phase 4), and `synthesizeSpeech` (via
  `tts-1`, added in Phase 5 -- see below)
- **Not implemented for Gemini:** `generateImage`, `editImage`, `transcribeAudio`,
  `synthesizeSpeech`. Text generation only for now
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
`POST /api/auto-clip` accepts either an uploaded long-form video OR a YouTube URL (real
`yt-dlp` download, validated against an exact hostname allowlist via `new URL()` -- not a
regex over the raw string, which a crafted URL could fool -- and gated behind a real,
recorded rights attestation via `consent_attestations` (`kind: 'rights_import'`), the
same table/pattern the security model already designed for rights-sensitive imports) +
a provider connection, then:
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

**YouTube import** (`src/lib/media/youtube.ts`) reuses this exact same pipeline from step 1
onward -- the download step just resolves a real local file path the same way an upload
does. Two separate `yt-dlp` invocations, not one combined metadata+download call: verified
directly against a real video during development that combining `--print` with an actual
download silently skipped writing the file on the installed `yt-dlp` version. Verified
end-to-end against a real public YouTube video ("Me at the zoo") -- real download, real
title captured, real recorded consent attestation, real transcription, real rendered
vertical clip confirmed via ffprobe and a visual frame-grab showing the actual downloaded
footage (not a placeholder) with the caption burned in. Also verified: a crafted URL
designed to fool a naive substring check (`https://evil.com/?u=youtube.com/...`) is
correctly rejected by the real `new URL()` + exact-hostname-allowlist check before any
download is attempted.

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

**Idea-to-Short** (`POST /api/idea-to-short`) is also built -- starts from just a topic,
not an existing video:
1. `generateText` writes a short narration script.
2. `synthesizeSpeech` narrates it (this required implementing real OpenAI speech synthesis
   first -- see the prerequisite fix below).
3. The real generated narration is transcribed (`transcribeAudio`) for real caption
   timestamps -- never LLM-invented, same principle as Auto Clip.
4. `generateImage` produces a background visual from the topic.
5. `src/lib/timeline/idea-to-short-render.ts` composites the still background + narration
   audio into a vertical video and burns in the real captions, reusing the same sharp/SVG +
   FFmpeg `overlay` technique as Auto Clip and the Phase 2 timeline renderer.
Reachable from the sidebar's now-real "Create" page (a workflow picker linking to Auto Clip
and Idea-to-Short) or directly at `/app/idea-to-short`. Verified end-to-end via the Mock
Provider through the real browser UI, and the rendered output confirmed via ffprobe (real
1080x1920, real audio) and a visual frame-grab showing the burned-in caption.

Prerequisite fix that unblocked this: `synthesizeSpeech` was never implemented for the real
OpenAI adapter, meaning the already-shipped **AI Voiceover** tool (Phase 4) had only ever
worked against the Mock Provider -- any real OpenAI connection hit "This provider doesn't
support speech synthesis" silently since Phase 4 shipped. Now implemented
(`openai-provider.ts`, returns a `data:` URL of the real generated bytes, no filesystem
side effect in the adapter itself -- same pattern as `generateImage`/`editImage`), and a
new shared `src/lib/ai/resolve-generated-media.ts` helper (data: URL or Mock's same-origin
path, never a raw remote URL fetched server-side) replaces the duplicated decode logic that
used to live only in the voiceover route. Verified: `synthesizeSpeech` exercised directly
against the real OpenAI API with a fake key (clean normalized 401, no crash); the Mock
Provider voiceover path re-verified end-to-end through the real route after the refactor.

**Not yet built:** Split-Screen Video, Reddit-style Story Video, Fictional Chat Story
Video (with disclosure metadata), Streamer Clip, full advanced timeline editor (effects,
keyframes, multi-select, snapping, virtualization, absolute-position/gap-aware
compositing), batch rendering.

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
