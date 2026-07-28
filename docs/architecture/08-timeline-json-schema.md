# Timeline JSON Schema

Designed now (Phase 1 doc), consumed by the full editor in Phase 5. Defined as a Zod
schema so it is both the runtime validator and the TypeScript type source.

```ts
import { z } from "zod";

export const TrackKind = z.enum([
  "video", "image", "text", "captions", "voiceover",
  "music", "sound_effect", "sticker", "shape", "overlay", "adjustment",
]);

export const TransformKeyframe = z.object({
  timeSeconds: z.number().nonnegative(),
  x: z.number(), y: z.number(),
  scale: z.number().positive().default(1),
  rotationDegrees: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  easing: z.enum(["linear", "easeIn", "easeOut", "easeInOut"]).default("linear"),
});

export const TimelineClip = z.object({
  id: z.string().uuid(),
  trackId: z.string().uuid(),
  assetId: z.string().uuid().nullable(), // null for text/shape clips with no media asset
  startSeconds: z.number().nonnegative(),
  durationSeconds: z.number().positive(),
  trimInSeconds: z.number().nonnegative().default(0),
  trimOutSeconds: z.number().nonnegative().nullable(),
  transformKeyframes: z.array(TransformKeyframe).default([]),
  effects: z.array(z.object({
    type: z.enum(["blur", "sharpen", "saturation", "contrast", "brightness", "temperature"]),
    value: z.number(),
  })).default([]),
  textContent: z.object({
    text: z.string(),
    fontFamily: z.string(),
    fontSizePx: z.number().positive(),
    color: z.string(),
    outlineColor: z.string().optional(),
    animation: z.enum(["none", "fadeIn", "popIn", "slideUp"]).default("none"),
  }).optional(),
  captionSegmentId: z.string().uuid().optional(),
  locked: z.boolean().default(false),
  hidden: z.boolean().default(false),
  muted: z.boolean().default(false),
  groupId: z.string().uuid().nullable().default(null),
});

export const TimelineTrack = z.object({
  id: z.string().uuid(),
  kind: TrackKind,
  order: z.number().int(),
  locked: z.boolean().default(false),
  hidden: z.boolean().default(false),
  muted: z.boolean().default(false),
});

export const TimelineMarker = z.object({
  id: z.string().uuid(),
  timeSeconds: z.number().nonnegative(),
  label: z.string(),
});

export const TimelineSpec = z.object({
  version: z.literal(1),
  canvasWidth: z.number().int().positive(),
  canvasHeight: z.number().int().positive(),
  frameRate: z.number().positive(),
  durationSeconds: z.number().positive(),
  tracks: z.array(TimelineTrack),
  clips: z.array(TimelineClip),
  markers: z.array(TimelineMarker).default([]),
  backgroundColor: z.string().default("#000000"),
});

export type TimelineSpecT = z.infer<typeof TimelineSpec>;
```

## Invariants enforced at the application layer (beyond Zod's shape validation)

- Every `clip.trackId` must reference a track present in the same `tracks` array.
- Every non-null `clip.assetId` must reference an asset the requesting user owns
  (checked server-side on every save, not just at upload time).
- `startSeconds + durationSeconds` must not exceed `durationSeconds` of the overall
  timeline for any clip (soft-warn in the editor, hard-reject on save if violated).
- Template JSON (see later template-system phase) is this same schema with
  `assetId: null` placeholders and a `requiredInputs` manifest — and is validated to
  contain **no** executable code, script tags, or arbitrary URLs before import.
