# Route Map

Legend: **Built** = real working code in this Phase-1 pass. **Designed** = specified
here and slotted into a later phase, not yet implemented.

## Public marketing routes

| Route | Auth | Status | Purpose |
|---|---|---|---|
| `/` | none | Built | Landing page |
| `/features` | none | Built | Feature overview |
| `/templates` | none | Built (shell) | Public template gallery preview |
| `/tools` | none | Built | Tool directory index |
| `/tools/video-cutter` | none | Built | Anonymous-capable video cutter |
| `/tools/video-cropper` | none | Built | Anonymous-capable video cropper |
| `/tools/video-compressor` | none | Designed | Phase 2 |
| `/tools/audio-balancer` | none | Designed | Phase 2 |
| `/tools/audio-converter` | none | Designed | Phase 2 |
| `/tools/background-remover` | none | Designed | Phase 6 |
| `/tools/subtitle-remover` | none | Designed | Phase 6 |
| `/login` | none | Built | Email/password + Google OAuth + magic link |
| `/signup` | none | Built | Account creation |
| `/forgot-password` | none | Built | Request reset |
| `/reset-password` | none | Built | Complete reset |
| `/support` | none | Built (shell) | Ticket categories, no key-paste prompt |
| `/privacy` | none | Built | Privacy policy incl. retention table |
| `/terms` | none | Built | Terms of use |
| `/acceptable-use` | none | Built | Prohibited-use policy |
| `/copyright` | none | Built | Copyright request workflow entry |
| `/likeness-removal` | none | Built | Likeness-removal request entry |
| `/data-deletion` | none | Built | Account/data deletion request entry |

**Explicitly never created:** `/pricing`, `/checkout`, `/billing`, `/subscription`,
`/upgrade`, or any route implying a paid tier.

## Authenticated app routes (`/app/*`)

| Route | Status | Purpose |
|---|---|---|
| `/app` | Built | Home |
| `/app/projects` | Built | Project dashboard (grid/list, CRUD) |
| `/app/projects/[id]` | Built (shell) | Project detail |
| `/app/create` | Designed | Workflow picker (Auto Clip, Split Screen, etc.) |
| `/app/auto-clip` | Designed | Phase 5 |
| `/app/templates` | Designed | Phase 6 |
| `/app/editor/[projectId]` | Designed | Phase 5 (basic cutter/cropper ship in Phase 2) |
| `/app/assets` | Designed | Phase 6 |
| `/app/ai-tools` | Designed | Phase 4 (directory), tools land Phases 4-6 |
| `/app/audio-tools` | Designed | Phase 4 |
| `/app/social-tracker` | Designed | Phase 7 |
| `/app/settings` | Built (shell) | Account + preferences |
| `/app/settings/providers` | Built | Provider Connections page (real, Mock Provider working) |
| `/app/settings/data` | Built (shell) | Export data / delete account entry points |

## Admin routes (`/admin/*`)

| Route | Status | Purpose |
|---|---|---|
| `/admin` | Designed | Phase 7 — operational dashboard, role-gated |

## API routes / Server Actions (representative, see 09/10/11 docs for detail)

Grouped by domain; each becomes a Zod-validated Server Action or Route Handler.

- **Projects**: create, update, save timeline, create/restore version, delete
- **Assets**: create signed upload URL, inspect, delete
- **Provider connections**: create, test, discover models, get capabilities, replace,
  rotate, delete
- **Jobs**: create (transcription/clip-analysis/image/voiceover/render/etc.), get status,
  cancel
- **Templates**: list, save personal, export/import JSON
- **Social**: connect, disconnect, sync (Phase 7)
- **Support/trust**: submit ticket, submit copyright request, submit likeness-removal
  request, export user data, delete account
