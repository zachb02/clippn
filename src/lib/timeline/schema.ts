import { z } from "zod";

// Phase 2 subset of docs/architecture/08-timeline-json-schema.md: video,
// captions/text, and audio tracks only -- no effects or transform
// keyframes yet (Phase 5).

export const TrackKind = z.enum(["video", "text", "audio"]);

export const TimelineClip = z.object({
  id: z.string().uuid(),
  trackId: z.string().uuid(),
  assetId: z.string().uuid().nullable(),
  startSeconds: z.number().nonnegative(),
  durationSeconds: z.number().positive(),
  trimInSeconds: z.number().nonnegative().default(0),
  textContent: z
    .object({
      text: z.string(),
      fontSizePx: z.number().positive().default(48),
      color: z.string().default("#ffffff"),
    })
    .nullable()
    .default(null),
});

export const TimelineTrack = z.object({
  id: z.string().uuid(),
  kind: TrackKind,
  order: z.number().int(),
});

export const TimelineSpec = z.object({
  version: z.literal(1),
  canvasWidth: z.number().int().positive().default(1080),
  canvasHeight: z.number().int().positive().default(1920),
  frameRate: z.number().positive().default(30),
  tracks: z.array(TimelineTrack),
  clips: z.array(TimelineClip),
});

export type TimelineSpecT = z.infer<typeof TimelineSpec>;
export type TimelineClipT = z.infer<typeof TimelineClip>;
export type TimelineTrackT = z.infer<typeof TimelineTrack>;

export function emptyTimeline(): TimelineSpecT {
  return {
    version: 1,
    canvasWidth: 1080,
    canvasHeight: 1920,
    frameRate: 30,
    tracks: [
      { id: crypto.randomUUID(), kind: "video", order: 0 },
      { id: crypto.randomUUID(), kind: "text", order: 1 },
      { id: crypto.randomUUID(), kind: "audio", order: 2 },
    ],
    clips: [],
  };
}

export function timelineDurationSeconds(timeline: TimelineSpecT): number {
  return timeline.clips.reduce((max, clip) => Math.max(max, clip.startSeconds + clip.durationSeconds), 0);
}
