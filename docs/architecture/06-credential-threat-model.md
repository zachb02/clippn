# Credential Threat Model

> **Superseded note:** Clippn has no accounts, so the "Spoofing" section's `auth.uid()`/
> RLS framing below no longer applies literally -- there is one local profile per clone,
> not multiple tenants to spoof between. The rest of this threat model (session-only vs.
> envelope-encrypted persistence, redaction, DoS, elevation-of-privilege) is unchanged and
> accurately describes the real implementation in `src/lib/credentials/`.

Scope: the lifecycle of a user's own Google Gemini or OpenAI API key from the moment
they type it into the Provider Connections form to the moment it is used for a real
provider call, or deleted.

## Assets being protected

1. The plaintext provider API key itself.
2. The decrypted-in-memory credential during active use.
3. The data-encryption keys (DEKs) protecting persisted credentials.
4. The master key / KMS key protecting DEKs.

## Trust boundaries

```
Browser  ──HTTPS──▶  Next.js server (Server Actions/Route Handlers)
                          │
                          ├─▶ Postgres (provider_connections, provider_credentials)
                          │
                          └─▶ Redis/BullMQ (job payloads: connection_id ONLY)
                                    │
                                    ▼
                              Worker process
                                    │
                        resolve + decrypt credential
                        (in-memory only, this call's lifetime)
                                    │
                                    ▼
                        Provider HTTP call (Gemini/OpenAI)
                                    │
                        credential reference zeroed/dropped
```

The browser never receives the plaintext key back after submission. The queue never
contains it. Only the worker, for the duration of one provider call, holds it decrypted
in memory.

## STRIDE-style threats and mitigations

### Spoofing
- **Threat**: attacker submits a connection under another user's identity.
- **Mitigation**: connection creation/test/rotate/delete requires an authenticated
  session; every query is scoped `where user_id = auth.uid()` and enforced again by RLS
  as defense-in-depth, not just application logic.

### Tampering
- **Threat**: attacker modifies a job payload to point at a different `connection_id`
  and exfiltrate use of someone else's credential.
- **Mitigation**: the worker re-checks `provider_connections.user_id` against the job's
  own recorded `user_id` before resolving any credential — a mismatch is a hard failure,
  logged as a security event, never silently corrected.

### Repudiation
- **Threat**: no record of who connected/rotated/deleted a credential.
- **Mitigation**: `audit_logs` records every connection lifecycle event
  (create/test/replace/rotate/delete) with actor, target, timestamp — **never the key
  value itself**, only connection metadata (provider, label, masked ending).

### Information disclosure (the primary risk surface)
- **Threat**: plaintext key leaks via logs, error messages, browser storage, queue
  payloads, database records, admin tooling, or support tickets.
- **Mitigations**, layered:
  1. **Session-only mode (default)**: key is sent once over HTTPS, immediately
     encrypted, stored in a short-lived server-side secret store (keyed by
     `connection_id`, TTL-bound, in-memory/Redis with encryption-at-rest for the
     runtime store itself), and deleted on logout or explicit disconnect. It is never
     written to the `provider_credentials` table at all in this mode.
  2. **Remembered mode (opt-in, explicit consent required)**: envelope encryption —
     a unique DEK per credential, generated at connection time, used to encrypt the key
     with authenticated encryption (AES-256-GCM), then the DEK itself is wrapped by a
     master key (KMS in production; a locally-held root key for dev, clearly labeled
     dev-only and never committed). Only ciphertext + wrapped DEK + safe metadata are
     stored. No code path — including admin tooling — can reverse this to plaintext
     through the UI.
  3. **Structured logging with mandatory redaction**: a logging middleware pattern-
     matches and redacts `Authorization` headers, `x-goog-api-key`, known key-format
     regexes (e.g. `AIza[0-9A-Za-z_-]{35}`, `sk-[A-Za-z0-9]{20,}`), and any field
     literally named `apiKey`/`credential`/`secret` before a log line is ever written,
     not after.
  4. **Queue payloads contain only `provider_connection_id`**, never a credential value
     — enforced by a Zod schema on the job-creation boundary that has no field capable
     of holding a raw key.
  5. **Support tickets are scanned for probable secrets** before storage; a detected
     match is blocked/redacted and the user is warned to rotate the exposed credential.
  6. **Client bundle**: the credential form is a Client Component that only ever POSTs
     the value to a Server Action; it is never read back into any client state, never
     placed in a URL/query string, and the field is `type="password"` with
     `autoComplete="off"`.

### Denial of service
- **Threat**: attacker abuses the credential-test endpoint to burn the user's own or
  another user's provider quota, or hammers the mock provider to disrupt other users.
- **Mitigation**: `validateCredential` uses the smallest practical request (e.g., a
  models-list call, not a generation call); rate limiting on connection-test and job-
  creation endpoints is uniform per-user, abuse-prevention only, never tiered by plan
  (there are no plans).

### Elevation of privilege
- **Threat**: an admin or a compromised admin session reveals a user's key.
- **Mitigation**: this is a hard product invariant, not a permission that can be
  granted. There is no API, admin UI affordance, or database view that returns a
  decrypted `provider_credentials.encrypted_credential` value under any role. The admin
  dashboard's "inspect connection" action can show *metadata only* (provider, label,
  status, masked ending, timestamps) — the same shape a regular user sees, with
  additional user/account context, never the secret.

## Residual risk (acknowledged, not hidden)

- A fully compromised production server process (RCE) could, in principle, observe a
  credential during the brief window it's decrypted in worker memory for an active
  call. This is the fundamental limit of any BYOK-with-server-side-calls design (it's
  also true of the provider's own official SDKs run server-side elsewhere) and is
  mitigated by standard infrastructure hardening (least-privilege workers, no
  unnecessary egress, dependency/secret scanning in CI) rather than claimed away.
- Local dev mode's master key is a plaintext file for developer convenience; this is
  explicitly documented as unsafe for production and the app refuses to boot in
  `NODE_ENV=production` without a real KMS-backed key configured.
