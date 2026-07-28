# Render Specification Schema

A render specification is the deterministic, fully-resolved input to the server-side
composition engine (Remotion or equivalent, Phase 5). It is derived from a
`TimelineSpec` plus export settings — never hand-edited directly by a user.

```ts
import { z } from "zod";
import { TimelineSpec } from "./08-timeline-json-schema";

export const ExportPreset = z.enum([
  "tiktok_1080x1920",
  "reels_1080x1920",
  "shorts_1080x1920",
  "square_1080x1080",
  "portrait_feed_1080x1350",
  "landscape_1920x1080",
  "custom",
]);

export const OutputFormat = z.enum(["mp4", "webm", "gif", "mp3", "wav", "png", "jpeg"]);

export const RenderSpec = z.object({
  version: z.literal(1),
  projectId: z.string().uuid(),
  timeline: TimelineSpec,
  exportPreset: ExportPreset,
  outputWidth: z.number().int().positive(),
  outputHeight: z.number().int().positive(),
  frameRate: z.number().positive(),
  format: OutputFormat,
  fonts: z.array(z.object({
    family: z.string(),
    // Only fonts the deployment has a valid license/self-hosted file for.
    sourceRef: z.string(),
  })),
  audioAutomation: z.array(z.object({
    trackId: z.string().uuid(),
    keyframes: z.array(z.object({ timeSeconds: z.number(), volume: z.number().min(0).max(2) })),
  })).default([]),
  // Explicitly absent, on purpose, forever:
  // watermark: never a field on this schema. There is no code path that can
  // stamp application branding onto rendered output.
});

export type RenderSpecT = z.infer<typeof RenderSpec>;
```

## Rendering guarantees

- **No watermark field exists in this schema**, and the render worker has no asset
  reference to a "watermark" image anywhere in its dependency graph — this is a
  structural absence, not a disabled flag that could be re-enabled.
- **No resolution restriction keyed to plan/account status.** `outputWidth`/
  `outputHeight` are bounded only by sane technical maximums (e.g. 4K) applied
  identically to every user, documented as an infrastructure/stability limit.
- Render jobs are idempotent (`idempotency_key` on `render_jobs`) — retrying a failed
  render never produces duplicate output assets.
- The render worker consumes exactly this spec and nothing else — it never re-queries
  "current plan" or "credit balance" because no such concept exists in this system.
