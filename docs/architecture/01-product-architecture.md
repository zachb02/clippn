# Product Architecture

## What Clippn is

Clippn is an original, independently-branded AI short-form video creation and editing
platform. It reproduces the *functional category* of AI-assisted short-form video
repurposing tools (auto-clipping long video, subtitle generation, voiceovers, AI imagery,
a multitrack timeline editor, templates, social performance tracking) with entirely
original branding, visual design, copy, and source code, and with **no paywall of any
kind** — every feature is available to every user. Clippn also has no accounts and no
hosted backend: each clone runs entirely on the user's own machine against their own
local Postgres/Redis, so "no account at all" isn't a subset of utilities, it's the whole
product.

## Three operating modes

Every AI-touching feature in Clippn declares which of these modes it can run under.
A feature may support more than one.

```
┌─────────────────────────────────────────────────────────────────┐
│ LOCAL MEDIA MODE                                                 │
│ No AI key required. Runs on FFmpeg/FFprobe + the app's own media │
│ workers. Video cut/crop/compress, audio balance/convert, basic   │
│ captions, manual templates, export, metadata inspection.         │
├─────────────────────────────────────────────────────────────────┤
│ CONNECTED AI MODE                                                │
│ User has connected Google Gemini and/or OpenAI with their own    │
│ API key (BYOK). Unlocks script writing, image generation/edit,   │
│ transcription, TTS, structured output, clip analysis — but only  │
│ the specific capabilities the connected provider/model actually  │
│ exposes (see 05-provider-capability-matrix.md).                  │
├─────────────────────────────────────────────────────────────────┤
│ MOCK PROVIDER MODE                                               │
│ No external key. Simulates every AI capability's success AND     │
│ failure modes (latency, rate limits, safety rejection, expired   │
│ credential, unsupported capability) so the full product can be  │
│ demoed and tested with zero external dependency.                 │
└─────────────────────────────────────────────────────────────────┘
```

These are not pricing tiers. They are *capability availability states* driven entirely by
what the user has connected, never by payment.

## System components

```
                       ┌───────────────────────┐
                       │   Next.js App Router   │
                       │  (marketing + app UI)  │
                       └───────────┬───────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                     │
     ┌────────▼────────┐  ┌────────▼────────┐  ┌─────────▼────────┐
     │  Server Actions  │  │   Route Handlers │  │  Browser-only     │
     │  (mutations)     │  │  (SSE/webhooks)  │  │  utilities (WASM  │
     │                  │  │                  │  │  ffmpeg, no acct) │
     └────────┬─────────┘  └────────┬─────────┘  └───────────────────┘
              │                     │
    ┌─────────▼─────────────────────▼──────────┐
    │         Application service layer          │
    │  ProjectService · AssetService · Credential │
    │  Service · TimelineService · JobService     │
    └─────────┬───────────────┬──────────────────┘
              │                │
   ┌──────────▼───────┐  ┌─────▼─────────────┐
   │  Local Postgres   │  │  Redis (session    │
   │  (single profile, │  │  credentials; a    │
   │  no RLS -- no     │  │  durable job queue │
   │  other tenant)    │  │  is designed, not   │
   │                    │  │  built yet)        │
   └───────────────────┘  └─────┬──────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   Worker processes         │
                    │  ┌──────────────────────┐ │
                    │  │ MediaProcessor         │ │  FFmpeg/FFprobe,
                    │  │ (sandboxed)            │ │  sandboxed Python
                    │  └──────────────────────┘ │  ML worker
                    │  ┌──────────────────────┐ │
                    │  │ AIProvider adapters    │ │  Gemini / OpenAI /
                    │  │ (Gemini/OpenAI/Mock)   │ │  Mock, credential
                    │  └──────────────────────┘ │  resolved just-in-time
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  Local filesystem storage   │
                    │  (storage/, gitignored --   │
                    │  the user's own machine,    │
                    │  not a cloud bucket)         │
                    └────────────────────────────┘
```

## Design principles that constrain every feature

1. **No paywall, ever.** No pricing/billing/credit/entitlement code exists anywhere in
   this codebase. Rate limits that exist are for abuse/stability only and apply
   uniformly regardless of account age or usage history.
2. **BYOK, never a shared production key.** All ordinary AI provider calls happen
   server-side using the *user's own* encrypted credential, resolved just-in-time inside
   a worker and never persisted in plaintext, logged, or placed in a queue payload.
3. **Capability-driven, not feature-hardcoded.** No UI control assumes a capability
   exists; every AI-touching control checks a live capability snapshot for the
   connected credential and disables/explains itself when unsupported.
4. **Local-first where feasible.** Anything that can run without an AI key (cutting,
   cropping, compression, basic captions, manual template editing) does, and works
   for anonymous browser users with no account.
5. **Consent and disclosure are structural, not cosmetic.** Face swap, fictional chat
   videos, and rights-sensitive imports carry real consent/attestation records in the
   database, not just a checkbox that's discarded after submit.

## What's implemented now vs. designed-for

See `12-implementation-plan.md` for the authoritative phase boundary. In short: this
repository's Phase 1 slice implements the brand, landing page, full DB schema, app
shell, project dashboard, anonymous video cutter/cropper (real FFmpeg), and the
provider-credential system with a fully working Mock Provider. Phases 2-8 (the full
tool directory, timeline editor, real Gemini/OpenAI adapters, social tracker, admin
dashboard, and full test suite) are designed against these same documents but not yet
built as code in this pass.
