import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { probeMedia } from "@/lib/media/ffmpeg";
import type { TimelineSpecT, TimelineClipT } from "./schema";

const execFileAsync = promisify(execFile);
const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";

/**
 * Renders a TimelineSpec to a single output file via a chain of plain
 * FFmpeg invocations (never one giant hand-built filter graph) -- each step
 * is simple enough to reason about and debug independently. Text captions
 * are rendered to transparent PNGs via sharp/SVG and composited with
 * FFmpeg's `overlay` filter, not `drawtext` -- this works regardless of
 * whether a given FFmpeg build was compiled with freetype/fontconfig
 * support (many Homebrew builds aren't), so it doesn't impose a
 * non-default FFmpeg variant on anyone cloning the repo.
 *
 * Video and audio tracks are treated as strictly sequential (clips play
 * back to back in ascending startSeconds order; startSeconds is used only
 * as an ordering key, not an absolute timestamp) -- see
 * docs/architecture/12-implementation-plan.md's Phase 2 scope ("basic...
 * no effects yet"). Text-track clips DO use absolute timeline time, since
 * they're independent overlays rather than sequential playback items.
 */
export async function renderTimeline(
  timeline: TimelineSpecT,
  resolveAssetPath: (assetId: string) => string,
  workDir: string,
  outputPath: string
): Promise<void> {
  await mkdir(workDir, { recursive: true });
  const { canvasWidth, canvasHeight, frameRate } = timeline;

  const videoTrackIds = new Set(timeline.tracks.filter((t) => t.kind === "video").map((t) => t.id));
  const audioTrackIds = new Set(timeline.tracks.filter((t) => t.kind === "audio").map((t) => t.id));
  const textTrackIds = new Set(timeline.tracks.filter((t) => t.kind === "text").map((t) => t.id));

  const videoClips = orderedClipsOnTracks(timeline.clips, videoTrackIds);
  const audioClips = orderedClipsOnTracks(timeline.clips, audioTrackIds);
  const textClips = orderedClipsOnTracks(timeline.clips, textTrackIds);

  if (videoClips.length === 0) {
    throw new Error("Add at least one clip to the video track before exporting.");
  }

  const concatenatedVideoPath = await buildConcatenatedVideo(
    videoClips,
    resolveAssetPath,
    workDir,
    canvasWidth,
    canvasHeight,
    frameRate
  );

  const videoWithAudioPath =
    audioClips.length > 0
      ? await mixInAudioTrack(concatenatedVideoPath, audioClips, resolveAssetPath, workDir)
      : concatenatedVideoPath;

  if (!textClips.some((c) => c.textContent !== null)) {
    await execFileAsync(FFMPEG_PATH, ["-y", "-i", videoWithAudioPath, "-c", "copy", outputPath]);
    return;
  }

  await burnInTextOverlays(videoWithAudioPath, textClips, workDir, outputPath, canvasWidth);
}

function orderedClipsOnTracks(clips: TimelineClipT[], trackIds: Set<string>): TimelineClipT[] {
  return clips
    .filter((c) => trackIds.has(c.trackId))
    .slice()
    .sort((a, b) => a.startSeconds - b.startSeconds);
}

async function buildConcatenatedVideo(
  clips: TimelineClipT[],
  resolveAssetPath: (assetId: string) => string,
  workDir: string,
  width: number,
  height: number,
  frameRate: number
): Promise<string> {
  const segmentPaths: string[] = [];
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    if (!clip.assetId) continue;
    const sourcePath = resolveAssetPath(clip.assetId);
    const segmentPath = path.join(workDir, `video-segment-${i}.mp4`);
    const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`;
    // Every segment gets a real audio stream, synthesizing silence when the
    // source has none -- otherwise concatenation is inconsistent across
    // segments and, more importantly, mixing in an audio-track clip later
    // (mixInAudioTrack) fails outright on a video with no audio at all.
    const { hasAudio } = await probeMedia(sourcePath);
    const args = hasAudio
      ? [
          "-y",
          "-ss", String(clip.trimInSeconds),
          "-i", sourcePath,
          "-t", String(clip.durationSeconds),
          "-vf", scaleFilter,
          "-r", String(frameRate),
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-c:a", "aac",
          segmentPath,
        ]
      : [
          "-y",
          "-ss", String(clip.trimInSeconds),
          "-i", sourcePath,
          "-f", "lavfi",
          "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
          "-t", String(clip.durationSeconds),
          "-vf", scaleFilter,
          "-r", String(frameRate),
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-c:a", "aac",
          "-shortest",
          segmentPath,
        ];
    await execFileAsync(FFMPEG_PATH, args);
    segmentPaths.push(segmentPath);
  }

  if (segmentPaths.length === 0) {
    throw new Error("The video track has no clips with a valid source asset to render.");
  }

  if (segmentPaths.length === 1) {
    return segmentPaths[0];
  }

  const listPath = path.join(workDir, "video-concat-list.txt");
  await writeFile(listPath, segmentPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
  const concatenatedPath = path.join(workDir, "video-concatenated.mp4");
  await execFileAsync(FFMPEG_PATH, ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", concatenatedPath]);
  return concatenatedPath;
}

async function mixInAudioTrack(
  videoPath: string,
  audioClips: TimelineClipT[],
  resolveAssetPath: (assetId: string) => string,
  workDir: string
): Promise<string> {
  const segmentPaths: string[] = [];
  for (let i = 0; i < audioClips.length; i++) {
    const clip = audioClips[i];
    if (!clip.assetId) continue;
    const sourcePath = resolveAssetPath(clip.assetId);
    const segmentPath = path.join(workDir, `audio-segment-${i}.aac`);
    await execFileAsync(FFMPEG_PATH, [
      "-y",
      "-ss", String(clip.trimInSeconds),
      "-i", sourcePath,
      "-t", String(clip.durationSeconds),
      "-vn",
      "-c:a", "aac",
      segmentPath,
    ]);
    segmentPaths.push(segmentPath);
  }
  if (segmentPaths.length === 0) return videoPath;

  let concatenatedAudioPath = segmentPaths[0];
  if (segmentPaths.length > 1) {
    const listPath = path.join(workDir, "audio-concat-list.txt");
    await writeFile(listPath, segmentPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
    concatenatedAudioPath = path.join(workDir, "audio-concatenated.aac");
    await execFileAsync(FFMPEG_PATH, [
      "-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", concatenatedAudioPath,
    ]);
  }

  const mixedPath = path.join(workDir, "video-with-audio-track.mp4");
  await execFileAsync(FFMPEG_PATH, [
    "-y",
    "-i", videoPath,
    "-i", concatenatedAudioPath,
    "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=0[a]",
    "-map", "0:v",
    "-map", "[a]",
    "-c:v", "copy",
    "-c:a", "aac",
    mixedPath,
  ]);
  return mixedPath;
}

async function burnInTextOverlays(
  videoPath: string,
  textClips: TimelineClipT[],
  workDir: string,
  outputPath: string,
  canvasWidth: number
): Promise<void> {
  const overlayHeight = 420;
  const inputArgs: string[] = ["-y", "-i", videoPath];
  const filterParts: string[] = [];
  let lastLabel = "0:v";

  // Filter out clips with no text content up front, so the running input
  // index below always matches the actual -i args pushed for this clip --
  // a null-content clip must never consume an index without adding an input.
  const captionClips = textClips.filter(
    (clip): clip is TimelineClipT & { textContent: NonNullable<TimelineClipT["textContent"]> } =>
      clip.textContent !== null
  );

  for (let i = 0; i < captionClips.length; i++) {
    const clip = captionClips[i];
    const pngPath = path.join(workDir, `caption-${i}.png`);
    await writeFile(pngPath, await renderCaptionPng(clip.textContent, canvasWidth, overlayHeight));
    inputArgs.push("-loop", "1", "-t", String(clip.durationSeconds), "-i", pngPath);
    const inputIndex = i + 1;
    const outLabel = `ov${i}`;
    const start = clip.startSeconds;
    const end = clip.startSeconds + clip.durationSeconds;
    filterParts.push(
      `[${lastLabel}][${inputIndex}:v]overlay=0:main_h-overlay_h-80:enable='between(t,${start},${end})'[${outLabel}]`
    );
    lastLabel = outLabel;
  }

  await execFileAsync(FFMPEG_PATH, [
    ...inputArgs,
    "-filter_complex", filterParts.join(";"),
    "-map", `[${lastLabel}]`,
    "-map", "0:a?",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-c:a", "copy",
    outputPath,
  ]);
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Rough monospace-independent estimate for bold sans-serif -- good enough
 * to decide wrap points without an actual font metrics library. */
function wrapToWidth(text: string, fontSizePx: number, maxWidth: number): string[] {
  const avgCharWidth = fontSizePx * 0.56;
  const maxCharsPerLine = Math.max(4, Math.floor(maxWidth / avgCharWidth));
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function renderCaptionPng(
  textContent: NonNullable<TimelineClipT["textContent"]>,
  width: number,
  height: number
): Promise<Buffer> {
  const safeWidth = width * 0.88;
  const lines = wrapToWidth(textContent.text, textContent.fontSizePx, safeWidth);
  const lineHeight = textContent.fontSizePx * 1.25;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

  const tspans = lines
    .map((line, i) => `<tspan x="50%" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join("\n");

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text font-size="${textContent.fontSizePx}" fill="${textContent.color}"
      stroke="black" stroke-width="${Math.max(2, textContent.fontSizePx / 20)}" paint-order="stroke"
      text-anchor="middle" font-family="sans-serif" font-weight="bold">
      ${tspans}
    </text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
