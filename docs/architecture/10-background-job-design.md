# Background Job Design

## Queue technology

BullMQ on Redis (durable, retry-capable, supports delayed/rate-limited queues natively).
Chosen over Inngest/Trigger.dev for Phase 1 because it runs against a plain Redis
instance with no additional hosted-service dependency — appropriate for a self-hostable
product. The `JobService` interface is written narrowly enough that swapping the queue
backend later would not touch calling code.

## Job types → queues

One BullMQ queue per job family (keeps concurrency/rate limits independent per
workload): `media-processing`, `ai-generation`, `rendering`, `social-sync`,
`file-deletion`.

## Job states (shared enum across `generation_jobs` and `render_jobs`)

```
pending → validating → queued → processing → [waiting_for_provider] → [downloading]
  → finalizing → completed
                                     └─▶ failed | rejected | cancelled | expired
                                     └─▶ reconnect_required (credential-specific)
```

## Every job, without exception

1. **Has an idempotency key**, generated client-side (UUID) and enforced unique at the
   database layer — a duplicate submission (double-click, retry) is a no-op that
   returns the existing job, never a second execution.
2. **Is retry-safe.** Workers are written so re-processing an already-partially-
   complete job either resumes cleanly or safely restarts from scratch; they never
   assume "this is the first attempt."
3. **Records progress** (0-100) so the UI can show real state via polling/SSE, not a
   fake spinner.
4. **Supports cancellation** where the underlying operation allows it (ffmpeg child
   process killed; provider long-running-operation cancellation call issued where the
   provider supports it).
5. **Never carries plaintext credentials** — only `provider_connection_id`. The worker
   resolves and decrypts the actual credential immediately before use and drops the
   reference immediately after (see `06-credential-threat-model.md`).
6. **Verifies ownership** at pickup time — the worker re-checks that the job's
   `user_id` still owns the referenced `project_id`/`asset_id`s before doing any work,
   in case of a race with a delete.
7. **Cleans up temp files** in a `finally` block regardless of success/failure.
8. **Normalizes errors** into the shared category enum (see `05-provider-capability-
   matrix.md`'s adjacent error doc / `11-security-model.md`) before surfacing to the
   user — never a raw provider stack trace.

## Status delivery to the client

Server-Sent Events for job status updates (simplest reliable option for a
mostly-one-directional progress stream; WebSockets/polling are documented fallbacks in
the same `JobStatusService` interface if infrastructure constraints require it).
