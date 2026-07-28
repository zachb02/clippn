# 🎬 clippn

> ✂️ An open, no-paywall studio for creating, editing, captioning, and repurposing short-form video.

clippn is a full-stack creator platform for turning ideas, long-form recordings, podcasts, gameplay, screen captures, and existing media into polished videos for Shorts, Reels, TikTok, and other social formats.

The application combines a browser-based multitrack editor, FFmpeg-powered media workers, reusable templates, automatic clipping, subtitles, voiceovers, AI-assisted scripting, image generation, audio cleanup, and optional social-performance tracking.

clippn does **not** sell subscriptions, credits, exports, resolution upgrades, or premium features. Every application feature is available to every user. Features that call an external AI service use a provider API key supplied by the user.

> 🚧 **Project status:** This README describes the intended production architecture and development workflow. Update the status notes and commands as implementation details change.

---

## Table of contents

- [Highlights](#highlights)
- [No-paywall policy](#no-paywall-policy)
- [Core workflows](#core-workflows)
- [AI and media tools](#ai-and-media-tools)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Repository layout](#repository-layout)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Provider connections](#provider-connections)
- [Media processing](#media-processing)
- [Database and storage](#database-and-storage)
- [Background jobs](#background-jobs)
- [Security model](#security-model)
- [Safety and acceptable use](#safety-and-acceptable-use)
- [Testing](#testing)
- [Deployment](#deployment)
- [Adding a provider](#adding-a-provider)
- [Adding a media processor](#adding-a-media-processor)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Highlights

- ✂️ **Automatic clipping:** Find self-contained highlights in podcasts, interviews, livestreams, and long videos.
- 🎬 **Multitrack editor:** Arrange video, images, audio, captions, text, overlays, shapes, and effects on a timeline.
- 💬 **Quick subtitles:** Generate, correct, style, animate, and export subtitles as burned-in video, SRT, VTT, or text.
- 📖 **Story workflows:** Build narrated story videos, fictional chat videos, streamer layouts, split-screen videos, and faceless shorts.
- 🤖 **AI-assisted creation:** Use Google Gemini, Nano Banana-compatible image models, OpenAI, or the built-in mock provider.
- 🛠️ **Local media tools:** Cut, crop, compress, inspect, convert, normalize, and export media without an AI key.
- 🔒 **Private projects:** Store projects, source assets, renders, transcripts, templates, and versions in user-scoped storage.
- 🧼 **No watermark:** Application-generated exports are not watermarked.
- 🆓 **No application billing:** No pricing page, checkout, subscriptions, credits, premium tier, or pay-to-export gate.
- 🏠 **Self-hostable:** Run the web application, database, object storage, queues, and media workers in your own environment.

---

## No-paywall policy

clippn intentionally contains no application-level monetization system.

The repository must not introduce:

- Pricing plans
- Subscriptions or trials
- Credit wallets
- Paid feature flags
- Export-minute allowances
- Resolution restrictions based on account level
- Premium templates
- Watermarked free exports
- Checkout or billing routes
- Stripe, Paddle, Lemon Squeezy, PayPal, or similar payment integrations
- Upgrade dialogs or plan badges

Reasonable technical limits may be used only for abuse prevention, service stability, file safety, or infrastructure protection. Such limits must apply consistently and must not be used as a hidden payment tier.

External providers may charge users under their own provider accounts. Those quotas and charges are outside clippn and must be disclosed before a request is submitted.

---

## Core workflows

### Auto Clip

Turn a long-form upload into multiple candidate shorts.

The pipeline can:

1. Inspect the source media.
2. Create a proxy for fast editing.
3. Extract and transcribe audio.
4. Divide the transcript into coherent topics.
5. Suggest clip boundaries.
6. Score candidates for hook strength, clarity, pacing, and context completeness.
7. Reframe speakers for vertical video.
8. Add captions.
9. Open selected clips in the editor.
10. Batch render final exports.

### Split-Screen Video

Combine primary footage with gameplay, screen recordings, demonstrations, reactions, or decorative video.

Supported layouts include top-and-bottom, side-by-side, picture-in-picture, reaction panel, three-panel, and custom resizable arrangements.

### Reddit-Style Story Video

Turn user-provided or properly authorized story text into a narrated short with timed captions, background footage, title cards, music ducking, and optional multi-part exports.

The workflow does not rely on unauthorized scraping and requires users to confirm that they have permission to reuse submitted text.

### Fictional Chat Story

Create clearly disclosed, fictional message-based story videos using original chat themes rather than pixel copies of proprietary messaging applications.

Exports support message timing, typing animations, reactions, avatars, narration, images, branches, and disclosure metadata.

### Streamer Clip

Format gameplay, livestream, webcam, and reaction footage for short-form platforms. Features include face tracking, gameplay crop, facecam layouts, reaction zooms, silence removal, caption styling, audio normalization, and safe-zone previews.

### Quick Subtitles

Generate and edit subtitles with word-level timing when available and segment-level timing as a fallback. Users can split, merge, shift, restyle, search, replace, regenerate, and export caption tracks.

### Idea-to-Short

Build a complete faceless short from a topic:

1. Generate hooks.
2. Choose an angle.
3. Create an outline and script.
4. Generate or record narration.
5. Add generated or uploaded visuals.
6. Select music.
7. Create captions.
8. Review the assembled timeline.
9. Edit and export.

---

## AI and media tools

### AI tools

- Content brainstormer
- Hook, outline, title, and script generation
- AI image generation
- Conversational image editing
- Icon and avatar generation
- Text-to-speech voiceover
- Speech transcription
- Speech enhancement
- Voice transformation using generic, non-identifying presets
- Vocal and instrumental separation
- Consent-controlled face swap
- Capability-gated AI video generation

### Local and worker-based media tools

- Video cutter
- Video cropper
- Video compressor
- Audio balancer
- Audio converter
- Video-to-audio converter
- Media inspector
- Background remover
- Burned-subtitle remover
- Proxy generator
- Thumbnail generator
- Waveform generator
- Deterministic final renderer

Tools that can run safely in the browser should be available without registration wherever practical. Cloud storage, durable background jobs, cross-device projects, and saved history require authentication.

---

## Architecture

```mermaid
flowchart LR
    Browser[Browser / Next.js UI]
    API[Next.js server routes and actions]
    Auth[Supabase Auth]
    DB[(PostgreSQL)]
    Storage[(Private object storage)]
    Redis[(Redis)]
    Queue[Durable job queue]
    Vault[Credential service + KMS]
    Media[Sandboxed media workers]
    Render[Render workers]
    Providers[Gemini / OpenAI / Mock provider]
    Social[Official social APIs]

    Browser --> API
    Browser -->|direct signed upload| Storage
    API --> Auth
    API --> DB
    API --> Redis
    API --> Queue
    API --> Vault
    Queue --> Media
    Queue --> Render
    Queue --> Providers
    Media --> Storage
    Render --> Storage
    Providers --> Storage
    API --> Social
    DB --> API
    Storage -->|short-lived signed URLs| Browser
```

### Design principles

- **Capability-driven:** UI controls depend on the selected provider and model rather than hard-coded assumptions.
- **Private by default:** Projects, assets, transcripts, renders, and credentials are user-scoped.
- **Durable jobs:** Long-running AI, transcription, conversion, and render work happens outside request lifecycles.
- **Deterministic rendering:** Saved timeline specifications render consistently across environments.
- **Provider independence:** External AI services are accessed through normalized adapters.
- **Local-first where practical:** Basic editing and utility functions do not require an AI provider.
- **Secrets stay server-side:** User-supplied credentials never return to the browser after submission.

---

## Technology stack

| Area | Recommended implementation |
|---|---|
| Web application | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS, accessible component primitives |
| Forms and validation | React Hook Form, Zod |
| Data fetching | TanStack Query and server actions/routes |
| Authentication | Supabase Auth |
| Database | PostgreSQL with Row Level Security |
| Object storage | Supabase Storage or S3-compatible private storage |
| Queue | BullMQ, Inngest, Trigger.dev, or equivalent |
| Queue state/cache | Redis |
| Media processing | FFmpeg and FFprobe in sandboxed workers |
| Composition/rendering | Remotion or an equivalent deterministic renderer |
| Browser media | WebCodecs, Canvas, WebGL where supported |
| AI providers | Google Gemini, OpenAI, mock provider |
| Credential protection | Envelope encryption with a managed KMS |
| Unit/integration tests | Vitest |
| End-to-end tests | Playwright |
| Containers | Docker and Docker Compose |

---

## Repository layout

A recommended monorepo structure:

```text
.
├── apps/
│   ├── web/                    # Next.js application
│   ├── media-worker/           # FFmpeg, transcription, audio, and utility jobs
│   └── render-worker/          # Deterministic composition and export jobs
├── packages/
│   ├── ai/                     # Provider interfaces and adapters
│   ├── auth/                   # Auth helpers and authorization policies
│   ├── config/                 # Typed environment configuration
│   ├── credentials/            # Session and persisted credential services
│   ├── database/               # Schema, migrations, queries, and RLS tests
│   ├── editor/                 # Timeline model and editor utilities
│   ├── jobs/                   # Job definitions, payload schemas, and status types
│   ├── media/                  # Media metadata and normalized processor interfaces
│   ├── render-spec/            # Versioned render specification
│   ├── safety/                 # Moderation, consent, and policy helpers
│   ├── storage/                # Signed upload/download helpers
│   ├── ui/                     # Shared UI components
│   └── validation/             # Shared Zod schemas
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── config.toml
├── docker/
│   ├── media-worker.Dockerfile
│   └── render-worker.Dockerfile
├── tests/
│   ├── e2e/
│   ├── integration/
│   └── security/
├── scripts/
├── docker-compose.yml
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

The exact structure may differ, but keep provider adapters, credential handling, media processing, rendering, and database access separated from UI code.

---

## Quick start

### Prerequisites

Install:

- Node.js 22 or newer
- pnpm 9 or newer
- Docker with Docker Compose
- FFmpeg and FFprobe for direct host-based media development
- Supabase CLI if using local Supabase services

### 1. Clone and install

```bash
git clone <your-repository-url>
cd <your-repository-directory>
pnpm install
```

### 2. Configure the environment

```bash
cp .env.example .env.local
```

Fill in the local database, storage, Redis, authentication, and encryption settings. Do not add production AI provider keys as shared application secrets.

### 3. Start local infrastructure

```bash
docker compose up -d
```

When the repository uses the Supabase CLI separately:

```bash
supabase start
```

### 4. Apply migrations and seed data

```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Start the application and workers

```bash
pnpm dev
```

Typical local endpoints:

- Web application: `http://localhost:3000`
- Supabase Studio: displayed by `supabase status`
- Object storage and Redis: configured in `docker-compose.yml`

### 6. Use the mock provider

Set:

```dotenv
ENABLE_MOCK_PROVIDER=true
DEFAULT_AI_PROVIDER=mock
```

The mock provider allows local development without a Gemini or OpenAI key. It should simulate success, failures, rate limits, safety rejections, latency, and long-running jobs.

---

## Environment variables

Use typed, startup-time validation. The application should fail fast when required infrastructure variables are absent.

A representative `.env.example`:

```dotenv
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_ENCRYPTION_CONTEXT=clippn-local

# Supabase / PostgreSQL
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace_me
SUPABASE_SERVICE_ROLE_KEY=replace_me
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Redis and jobs
REDIS_URL=redis://localhost:6379
JOB_QUEUE_PREFIX=clippn
MEDIA_WORKER_CONCURRENCY=2
RENDER_WORKER_CONCURRENCY=1

# Private object storage
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_REGION=us-east-1
STORAGE_BUCKET=clippn-private
STORAGE_ACCESS_KEY_ID=replace_me
STORAGE_SECRET_ACCESS_KEY=replace_me
STORAGE_FORCE_PATH_STYLE=true
SIGNED_URL_TTL_SECONDS=900

# Credential protection
CREDENTIAL_STORAGE_BACKEND=local-development
KMS_PROVIDER=local-development
KMS_KEY_ID=replace_with_managed_kms_key_id_in_production
SESSION_CREDENTIAL_TTL_HOURS=12
ALLOW_PERSISTENT_PROVIDER_CREDENTIALS=true

# Email
EMAIL_PROVIDER=resend
RESEND_API_KEY=replace_me
EMAIL_FROM=clippn <no-reply@example.com>

# Media tools
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
MAX_UPLOAD_BYTES=2147483648
MAX_VIDEO_DURATION_SECONDS=14400
TEMP_MEDIA_DIR=/tmp/clippn

# Provider behavior
ENABLE_MOCK_PROVIDER=true
DEFAULT_AI_PROVIDER=mock

# Development-only shared keys. Never enable or set these in production.
ALLOW_DEVELOPMENT_SHARED_PROVIDER_KEYS=false
OPENAI_DEVELOPMENT_API_KEY=
GEMINI_DEVELOPMENT_API_KEY=

# Social OAuth integrations
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
TIKTOK_CLIENT_ID=
TIKTOK_CLIENT_SECRET=
META_CLIENT_ID=
META_CLIENT_SECRET=

# Monitoring
SENTRY_DSN=
LOG_LEVEL=info
ENABLE_SECRET_LEAK_ALERTS=true
```

### Production credential rule

Production users paste their own provider key through the Provider Connections screen. A shared server-level OpenAI or Gemini key must not act as a silent fallback.

---

## Provider connections

clippn supports:

- Google Gemini, including Nano Banana-compatible image generation and editing when available
- OpenAI Platform APIs for compatible text, image, speech, and transcription capabilities
- A deterministic mock provider for development and testing

Model access changes over time and differs by provider account. The application therefore combines runtime model discovery, a server-controlled allowlist, a versioned capability map, and request-time validation.

### Storage modes

#### Session only

This is the default.

- The key is sent to the backend over HTTPS.
- The backend encrypts it immediately.
- It is stored in a short-lived server-side secret store.
- It is associated with the authenticated user and session.
- It expires automatically.
- It is deleted on logout or disconnect.
- Queue payloads include only a `provider_connection_id`.

#### Remember securely

This is optional and requires explicit consent.

- Each credential receives a unique data-encryption key.
- The credential is encrypted using authenticated encryption such as AES-256-GCM.
- The data key is wrapped by a managed KMS key.
- Only ciphertext and encryption metadata are stored.
- The plaintext key is never retrievable through the UI or an administrative endpoint.
- Users can replace, rotate, disconnect, or permanently delete the credential.

### Important distinction

An OpenAI Platform API key is not the same thing as a ChatGPT password or browser session. Similarly, a Google Gemini API key is not a Google account password. The connection form must reject or warn against pasting account passwords, cookies, OAuth session tokens, or unrelated secrets.

---

## Media processing

### Worker isolation

FFmpeg, FFprobe, transcription, background removal, stem separation, and render jobs should run in isolated workers with:

- CPU limits
- Memory limits
- Execution timeouts
- Temporary filesystem quotas
- Restricted network access
- Read-only application images where practical
- No cloud metadata endpoint access
- Structured command arguments

Never build shell commands by concatenating untrusted strings.

Preferred:

```ts
spawn(ffmpegPath, [
  "-i",
  safeInputPath,
  "-vf",
  normalizedFilterGraph,
  safeOutputPath,
]);
```

Avoid:

```ts
exec(`ffmpeg -i ${userInput} ${output}`);
```

### Proxy workflow

Large source files should be converted into lower-resolution edit proxies. The editor uses proxies for previews and references the original source during final rendering.

### Deterministic renders

Every project should save a versioned render specification containing:

- Canvas size
- Frame rate
- Duration
- Track and clip order
- Asset IDs
- Transform keyframes
- Text and font settings
- Captions
- Audio automation
- Effects
- Output settings

The renderer must resolve assets by authorized internal IDs rather than arbitrary user-provided paths or URLs.

---

## Database and storage

### Core tables

The schema should include at least:

- `profiles`
- `user_roles`
- `user_preferences`
- `provider_connections`
- `provider_credentials`
- `provider_capability_snapshots`
- `model_catalog`
- `projects`
- `project_versions`
- `assets`
- `asset_metadata`
- `asset_licenses`
- `transcripts`
- `transcript_segments`
- `scripts`
- `voiceovers`
- `caption_tracks`
- `caption_segments`
- `timelines`
- `timeline_tracks`
- `timeline_clips`
- `templates`
- `generation_jobs`
- `render_jobs`
- `rendered_assets`
- `content_briefs`
- `brief_submissions`
- `social_connections`
- `social_accounts`
- `social_posts`
- `social_metric_snapshots`
- `consent_attestations`
- `moderation_events`
- `support_tickets`
- `copyright_requests`
- `likeness_removal_requests`
- `data_deletion_requests`
- `audit_logs`
- `feature_flags`

The schema must not include application billing, subscription, invoice, credit-wallet, checkout, or paid-entitlement tables.

### Row Level Security

Every user-owned table must have Row Level Security policies that prevent cross-tenant reads and writes. Service-role access should be limited to narrowly scoped server and worker operations.

### Private storage

- Source media and renders live in private buckets.
- The browser uploads through short-lived, user-scoped signed URLs.
- Downloads use short-lived signed URLs.
- Storage object names must not expose private prompts or user-supplied filenames.
- A project or asset deletion request must enqueue physical object deletion.

### Default retention

Recommended defaults:

- Anonymous temporary media: delete shortly after export
- Worker temporary files: delete immediately after job completion
- Cloud source uploads: delete after 30 days unless retained by the user
- Generated outputs: retain while the account is active unless deleted
- Session-only credentials: expire automatically
- Deleted-account media: enqueue for permanent deletion
- Decrypted credentials: never persist

---

## Background jobs

Long-running tasks must use durable, retry-safe jobs.

Examples:

- Proxy generation
- Thumbnail and waveform generation
- Transcription
- Clip analysis
- AI text or image generation
- Speech synthesis
- Audio enhancement
- Stem separation
- Background removal
- Subtitle removal
- Face swap
- AI video generation
- Final rendering
- Social-metric synchronization
- Data deletion

### Job states

```text
pending
validating
queued
processing
waiting_for_provider
downloading
finalizing
completed
failed
rejected
cancelled
expired
reconnect_required
```

### Job guarantees

Every job must:

- Have an idempotency key
- Validate user ownership
- Use safe internal asset references
- Avoid plaintext provider credentials
- Report progress
- Support cancellation where practical
- Normalize errors
- Clean up temporary files
- Avoid duplicate outputs during retries

A worker resolves and decrypts a provider credential only immediately before making the provider request. The decrypted value should remain in memory for the shortest practical duration.

---

## Security model

### Credential rules

Provider API keys must never appear in:

- Browser storage
- Cookies
- Client bundles
- HTML or hydration payloads
- URLs or query strings
- Referrer headers
- Application logs
- Error messages or toasts
- Queue payloads
- Project or job records
- Analytics events
- Monitoring breadcrumbs
- Support tickets
- Audit-log details

Automatically redact authorization headers, provider key headers, likely provider key formats, and secret form fields.

### Media and request security

Implement:

- MIME and file-signature validation
- Filename sanitization
- Upload size and duration limits
- Image decompression-bomb protection
- Media decoder resource limits
- Malware scanning where available
- Private storage and signed URLs
- CSRF-safe writes
- Secure, HTTP-only, SameSite cookies
- Content Security Policy
- Rate limiting
- SSRF protection
- Provider-domain allowlists
- Redirect validation
- OAuth-token encryption
- Secret scanning in CI
- Dependency scanning
- KMS key rotation

Do not allow users to control arbitrary provider base URLs, callback URLs, FFmpeg command strings, shell paths, internal IP addresses, cloud metadata addresses, queue names, or authorization headers.

### Administrative access

Administrators may inspect safe operational metadata when necessary, but must not be able to:

- Reveal or copy user API keys
- Download decrypted credentials
- Bypass likeness consent
- Bypass moderation
- View private media without an audited operational reason

---

## Safety and acceptable use

clippn is a creative tool, not a moderation bypass.

Prohibited uses include:

- Sexual content involving minors
- Any sexualization of minors
- Non-consensual intimate media
- Deceptive face swaps
- Deceptive voice impersonation
- Fabricated evidence
- Fraud and scams
- Harassment, defamation, or doxxing
- Copyright infringement
- Trademark impersonation
- Illegal content
- Attempts to bypass application or provider safeguards

### Likeness processing

Face-swap or likeness-editing workflows require an unchecked consent attestation:

> I confirm that I own this media or have explicit permission from every identifiable person whose likeness will be processed.

The application records the user, project, source assets, timestamp, selected provider or processor, and consent-statement version.

### Fictional chat disclosures

Fictional chat videos should include a visible disclosure option enabled by default and preserve disclosure metadata in the exported file.

### Takedowns

Provide dedicated copyright, likeness-removal, privacy, and data-deletion workflows. Authorized administrators must be able to disable disputed assets while preserving evidence securely for review.

---

## Testing

### Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm test:security
```

### Critical test coverage

The suite should verify that:

1. There is no pricing, checkout, billing, or subscription route.
2. No feature is gated by a paid plan.
3. Anonymous utility users can export without registering.
4. Application exports contain no watermark.
5. Provider keys never appear in browser storage, responses, logs, traces, jobs, or project records.
6. Session-only credentials expire and are removed on logout.
7. Persisted credentials are encrypted before database insertion.
8. Credential replacement invalidates the previous credential.
9. Administrators cannot reveal credentials.
10. One user cannot access another user’s projects, assets, or provider connections.
11. Unsupported provider features are disabled before submission.
12. Background job retries do not create duplicate outputs.
13. Provider callbacks are idempotent.
14. Unsafe shell characters cannot alter media-worker commands.
15. Imported URLs cannot target local, private, or cloud-metadata addresses.
16. Likeness processing requires recorded consent.
17. Deleted assets are no longer downloadable.
18. Account deletion queues all owned media and credentials for deletion.
19. Social OAuth tokens are encrypted.
20. Local cutting, cropping, conversion, and compression work without an AI provider key.
21. Mock-provider mode works without external services.
22. Final output matches the saved render specification.

### Test media

Keep small, redistributable test fixtures in a dedicated directory. Do not commit copyrighted music, movie clips, private recordings, or real provider credentials.

---

## Deployment

A production deployment normally includes separate services for:

- Next.js web application
- PostgreSQL
- Private object storage
- Redis
- General job workers
- FFmpeg media workers
- Render workers
- Managed KMS
- Email delivery
- Monitoring and error reporting

### Important deployment note

Heavy FFmpeg and final-render jobs are usually a poor fit for short-lived serverless functions. Run them in dedicated containers or workers with controlled CPU, memory, disk, and time limits.

### Production checklist

- [ ] HTTPS is enforced.
- [ ] Database migrations are applied.
- [ ] Row Level Security tests pass.
- [ ] Private buckets are not publicly readable.
- [ ] Signed URLs have short expiration times.
- [ ] KMS-backed credential encryption is enabled.
- [ ] Development shared provider keys are disabled.
- [ ] Queue workers cannot access unrelated secrets.
- [ ] Worker network egress is restricted.
- [ ] FFmpeg and image libraries are patched.
- [ ] Rate limits are configured.
- [ ] Secret redaction is verified in logs and error reporting.
- [ ] Data-retention jobs are scheduled.
- [ ] Backup and restore procedures are tested.
- [ ] Copyright, likeness, privacy, and deletion contacts are configured.
- [ ] No pricing, billing, credit, or upgrade route exists.

---

## Adding a provider

Implement the normalized provider contract rather than calling provider SDKs directly from UI code.

```ts
export interface AIProvider {
  id: "google-gemini" | "openai" | "mock" | string;

  validateCredential(
    credential: DecryptedCredential,
  ): Promise<CredentialValidationResult>;

  discoverModels(
    credential: DecryptedCredential,
  ): Promise<ModelDescriptor[]>;

  getCapabilities(
    credential: DecryptedCredential,
    modelId?: string,
  ): Promise<ProviderCapabilities>;

  generateText?(
    input: TextGenerationInput,
    credential: DecryptedCredential,
  ): Promise<TextGenerationResult>;

  generateImage?(
    input: ImageGenerationInput,
    credential: DecryptedCredential,
  ): Promise<ImageGenerationResult>;

  editImage?(
    input: ImageEditInput,
    credential: DecryptedCredential,
  ): Promise<ImageGenerationResult>;

  transcribeAudio?(
    input: TranscriptionInput,
    credential: DecryptedCredential,
  ): Promise<TranscriptResult>;

  synthesizeSpeech?(
    input: SpeechSynthesisInput,
    credential: DecryptedCredential,
  ): Promise<SpeechResult>;

  createVideoJob?(
    input: VideoGenerationInput,
    credential: DecryptedCredential,
  ): Promise<ProviderJob>;

  getJobStatus?(
    providerJobId: string,
    credential: DecryptedCredential,
  ): Promise<ProviderJobStatus>;

  normalizeError(error: unknown): NormalizedProviderError;
}
```

A new provider adapter must include:

- Credential validation
- Safe model discovery
- A server-controlled capability map
- Request and response normalization
- Provider error normalization
- Rate-limit handling
- Safety-response handling
- Secret-redaction tests
- Capability-gating tests
- Documentation

Never expose a feature merely because an SDK method exists. Confirm that the connected account and selected model support it.

---

## Adding a media processor

Use a normalized processor interface:

```ts
export interface MediaProcessor {
  inspectMedia(input: StoredAsset): Promise<MediaMetadata>;
  transcode(input: TranscodeInput): Promise<StoredAsset>;
  trim(input: TrimInput): Promise<StoredAsset>;
  crop(input: CropInput): Promise<StoredAsset>;
  compose(input: CompositionInput): Promise<StoredAsset>;
  extractAudio(input: StoredAsset): Promise<StoredAsset>;
  normalizeAudio(input: AudioNormalizeInput): Promise<StoredAsset>;
  separateStems?(input: StoredAsset): Promise<StemResult>;
  removeBackground?(input: BackgroundRemovalInput): Promise<StoredAsset>;
  removeBurnedSubtitles?(
    input: SubtitleRemovalInput,
  ): Promise<StoredAsset>;
}
```

Processors must:

- Accept validated internal asset references
- Run in a sandboxed worker
- Use structured process arguments
- Enforce resource limits
- Produce normalized metadata
- Clean up temporary files
- Be retry-safe where practical
- Never read another user’s asset without authorization

---

## Troubleshooting

### The mock provider is unavailable

Confirm:

```dotenv
ENABLE_MOCK_PROVIDER=true
DEFAULT_AI_PROVIDER=mock
```

Restart the web application and workers after changing environment variables.

### FFmpeg is not found

Check:

```bash
ffmpeg -version
ffprobe -version
```

Set explicit paths when the binaries are installed outside the system `PATH`:

```dotenv
FFMPEG_PATH=/usr/local/bin/ffmpeg
FFPROBE_PATH=/usr/local/bin/ffprobe
```

### Jobs remain queued

Verify:

- Redis is reachable.
- Worker processes are running.
- Web and workers use the same queue prefix.
- The worker can access storage.
- The job payload contains valid internal IDs.

### A provider key validates but a feature is disabled

Provider access can differ by project, account, model, region, or current API availability. Retest the connection, refresh the capability snapshot, and select a compatible model. Do not bypass capability checks.

### Upload succeeds but preview fails

Confirm that:

- The asset record belongs to the current user.
- The signed URL has not expired.
- The proxy-generation job completed.
- The browser supports the source codec.
- The application can fall back to a compatible proxy codec.

### Rendering fails in a serverless deployment

Move rendering to a dedicated container or worker. Final media renders often exceed serverless memory, disk, or execution-time limits.

---

## Contributing

Contributions are welcome when they preserve the project’s privacy, safety, and no-paywall principles.

Before opening a pull request:

1. Create or link an issue for substantial changes.
2. Keep provider-specific logic inside an adapter.
3. Add tests for security-sensitive behavior.
4. Add migration and rollback notes for schema changes.
5. Avoid committing generated media, large binaries, copyrighted fixtures, or secrets.
6. Run linting, type checking, unit tests, integration tests, and relevant end-to-end tests.
7. Document new environment variables and operational requirements.

Suggested commit style:

```text
feat(editor): add ripple delete
fix(credentials): redact provider errors before logging
test(rls): prevent cross-user asset access
docs(workers): document render resource limits
```

### Pull-request checklist

- [ ] No billing, checkout, credits, or paid gate was introduced.
- [ ] No application watermark was introduced.
- [ ] User data remains private by default.
- [ ] Secrets do not appear in logs, payloads, or browser storage.
- [ ] New media commands use structured arguments.
- [ ] New provider features are capability-gated.
- [ ] Accessibility was considered.
- [ ] Tests and documentation were updated.

---

## License

No license is selected by this README alone. Add a `LICENSE` file before public distribution and confirm that all bundled fonts, music, sound effects, templates, icons, fixtures, and sample media are compatible with that license.

Third-party APIs, models, SDKs, codecs, fonts, and social platforms remain subject to their own terms and licenses.

---

## Disclaimer

clippn is an independent project and is not affiliated with Crayo, Google, OpenAI, TikTok, Meta, YouTube, Reddit, or any other referenced platform unless an explicit relationship is documented separately.

Users are responsible for having the rights and permissions required to upload, edit, generate, publish, or redistribute content. AI output can be inaccurate or unsuitable and should be reviewed before publication.
