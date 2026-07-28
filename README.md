# Clippn

An original, independently-branded AI short-form video creation and editing platform.
No pricing, no paywall, no credits, no watermark — every feature is available to every
user. Local media tools work with no AI key at all; script/image/voice/transcription
features run through a Google Gemini or OpenAI key you bring yourself, or through a
built-in Mock Provider for demoing and testing with zero external dependency.

See `docs/architecture/` for the full design (product architecture, DB schema, provider
capability matrix, credential threat model, and the phased implementation plan — start
with `12-implementation-plan.md` for an honest built-vs-designed status).

## Status

This repository is in active, phased development. Phase 1 (brand, landing page, DB
schema, app shell, project dashboard, anonymous video cutter/cropper, and the
provider-credential system with a working Mock Provider) is built and verified. Later
phases (the full tool directory, timeline editor, real Gemini/OpenAI adapters, social
tracker, admin dashboard, full test suite) are designed but not yet implemented — see
`docs/architecture/12-implementation-plan.md`.

## Local development

Requires Node 20+, a Postgres 16 instance, and Redis.

```bash
npm install
cp .env.example .env.local   # fill in your own local values, never commit real secrets
npm run dev
```

## Local infrastructure (no Docker required for the database/queue)

```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis
createdb clippn_dev
```

Auth/storage in production run against Supabase; see `docs/architecture/` for what
that requires and how local development can substitute a lighter-weight setup.

## Scripts

- `npm run dev` - start the Next.js dev server
- `npm run build` / `npm run start` - production build/start
- `npm run lint` - ESLint
- `npm run test` - Vitest unit/integration tests
- `npm run test:e2e` - Playwright end-to-end tests

## No paywall, structurally

There is no pricing page, checkout flow, billing system, subscription table, credit
wallet, or entitlement check anywhere in this codebase, and none is ever added. Rate
limits that exist are for abuse prevention and infrastructure stability only, applied
uniformly to every account.
