# Security Model

> **Superseded note:** the "Tenant isolation" section below describes the original
> Supabase-Auth/RLS design. Clippn has no accounts and no hosted backend -- RLS was
> removed (see `12-implementation-plan.md`); a local single-user database has no other
> tenant to isolate from. Every other section (storage, SSRF protection, input
> validation, headers, rate limiting, secret hygiene) still describes the real
> implementation accurately.

## Tenant isolation (superseded -- kept for historical context, see note above)

Every user-owned table has RLS enabled with a uniform policy pattern:

```sql
alter table <table> enable row level security;

create policy "<table>_select_own" on <table>
  for select using (auth.uid() = user_id);

create policy "<table>_insert_own" on <table>
  for insert with check (auth.uid() = user_id);

create policy "<table>_update_own" on <table>
  for update using (auth.uid() = user_id);

create policy "<table>_delete_own" on <table>
  for delete using (auth.uid() = user_id);
```

Tables reached only through a parent (e.g. `folder_assets`) are scoped via a join back
to the owning row's `user_id` rather than duplicating the column pointlessly.
Application-layer authorization checks are kept as defense-in-depth on top of RLS, not
instead of it — a bug in one layer should not be a full compromise.

## Storage

- All buckets private by default; every read/write goes through a short-lived signed
  URL, never a public bucket policy.
- Signed URLs expire quickly (minutes, not hours) and are scoped to the specific
  object.

## Network egress / SSRF protection

- The "rights-respecting social media importer" and any provider callback validation
  reject: localhost, loopback, link-local, and RFC1918 private ranges, and the cloud
  metadata endpoint (`169.254.169.254`) specifically.
- No user-supplied provider base URL is ever accepted — provider adapters call a
  fixed, code-defined base URL per provider.
- Redirects during an authorized import are validated against the same allowlist
  before being followed.

## Input validation

- Every Server Action / Route Handler validates its input with Zod at the boundary,
  before any business logic runs.
- File uploads: signature/magic-byte check against declared MIME type, size limits,
  ffprobe-based duration/resolution caps, filename sanitization (never used as an
  on-disk path).
- Shell safety: structured argument arrays only for any subprocess invocation (ffmpeg,
  future Python worker) — see `07-media-processing-architecture.md`. No user input is
  ever interpolated into a command string.

## Headers and transport

- Content-Security-Policy restricting script/style/connect sources to self + the
  specific provider/storage origins required.
- `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY` (or CSP frame-ancestors equivalent), `Referrer-Policy:
  strict-origin-when-cross-origin`.
- Session cookies: not applicable -- there is no login session, since there are no
  accounts. The app is reachable only on the machine it runs on.
- Mutating Server Actions rely on Next.js's built-in same-origin enforcement for
  Actions; any additional Route Handler that mutates state validates an
  origin/CSRF-safe pattern explicitly.

## Rate limiting (abuse prevention only — see product invariant)

Applied uniformly per user (not per plan, because there are no plans) to:
connection-test, job-creation, and support-ticket endpoints. Implemented as a Redis-
backed sliding window, with a hard cap on tracked-key memory (bounded eviction, not
unbounded growth — a lesson already relearned once on a smaller project this session).

## Secret hygiene

- Structured logger redacts before write, not after — see `06-credential-threat-
  model.md` for the exact patterns matched.
- CI runs dependency scanning and secret scanning (e.g. gitleaks-style patterns) on
  every push; a detected literal secret blocks the build.
- `.env.example` ships with every variable name and zero real values.

## What user input may never control (hard invariant, enforced by construction, not by
## a runtime check that could be bypassed)

Shell executable paths, raw FFmpeg command strings, arbitrary provider base URLs,
arbitrary callback URLs, internal IP addresses, cloud metadata endpoints, Authorization
headers, storage credentials, queue names, worker environment variables.
