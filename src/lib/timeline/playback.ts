import type { TimelineSpecT, TimelineClipT } from "./schema";

export interface SequencedClip {
  clip: TimelineClipT;
  playbackStart: number;
  playbackEnd: number;
}

/** Video/audio tracks play sequentially -- startSeconds is an ordering key,
 * not an absolute timestamp. This computes each clip's real playback window. */
export function sequenceClips(clips: TimelineClipT[], trackId: string): SequencedClip[] {
  const onTrack = clips.filter((c) => c.trackId === trackId).sort((a, b) => a.startSeconds - b.startSeconds);
  let cursor = 0;
  return onTrack.map((clip) => {
    const playbackStart = cursor;
    const playbackEnd = cursor + clip.durationSeconds;
    cursor = playbackEnd;
    return { clip, playbackStart, playbackEnd };
  });
}

export function totalSequencedDuration(clips: TimelineClipT[], trackId: string): number {
  const sequenced = sequenceClips(clips, trackId);
  return sequenced.length > 0 ? sequenced[sequenced.length - 1].playbackEnd : 0;
}

export function findActiveClip(sequenced: SequencedClip[], playheadSeconds: number): SequencedClip | null {
  return sequenced.find((s) => playheadSeconds >= s.playbackStart && playheadSeconds < s.playbackEnd) ?? null;
}

export function timelineDuration(timeline: TimelineSpecT): number {
  const videoTrack = timeline.tracks.find((t) => t.kind === "video");
  const videoDuration = videoTrack ? totalSequencedDuration(timeline.clips, videoTrack.id) : 0;
  const textEnds = timeline.clips
    .filter((c) => timeline.tracks.find((t) => t.id === c.trackId)?.kind === "text")
    .map((c) => c.startSeconds + c.durationSeconds);
  return Math.max(videoDuration, ...textEnds, 0);
}
