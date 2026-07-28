import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { probeMedia } from "@/lib/media/ffmpeg";
import { renderCaptionPng } from "./render";

const execFileAsync = promisify(execFile);
const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";

export interface AutoClipCaption {
  /** Absolute seconds in the *source* video, not the trimmed clip. */
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface RenderAutoClipSegmentInput {
  sourcePath: string;
  outputPath: string;
  workDir: string;
  /** Absolute seconds in the source video. */
  startSeconds: number;
  endSeconds: number;
  /** Real transcript segments overlapping this range -- captions are never
   * invented, only the highlight boundaries come from the LLM. */
  captions: AutoClipCaption[];
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * Trims one highlight range out of a long source video, reframes it to a
 * vertical canvas (center-crop after an aspect-preserving upscale, not
 * letterboxing -- Auto Clip's whole point is a ready-to-post short), and
 * burns in the real transcript captions that fall in that range, time-
 * shifted to the clip's own local timeline. Reuses the exact sharp/SVG +
 * FFmpeg `overlay` caption technique already verified in the timeline
 * renderer (see render.ts) rather than re-implementing text compositing.
 */
export async function renderAutoClipSegment(input: RenderAutoClipSegmentInput): Promise<void> {
  const { sourcePath, outputPath, workDir, startSeconds, endSeconds, captions } = input;
  const canvasWidth = input.canvasWidth ?? 1080;
  const canvasHeight = input.canvasHeight ?? 1920;
  const durationSeconds = endSeconds - startSeconds;
  if (durationSeconds <= 0) {
    throw new Error("A clip's end must be after its start.");
  }

  await mkdir(workDir, { recursive: true });

  const { hasAudio } = await probeMedia(sourcePath);
  // increase (not decrease) + crop, unlike the timeline editor's pad-to-fit:
  // Auto Clip always fills the vertical frame edge-to-edge, cropping any
  // excess, rather than letterboxing a horizontal source.
  const scaleFilter = `scale=${canvasWidth}:${canvasHeight}:force_original_aspect_ratio=increase,crop=${canvasWidth}:${canvasHeight},setsar=1`;
  const scaledPath = path.join(workDir, "scaled.mp4");
  const trimArgs = hasAudio
    ? [
        "-y",
        "-ss", String(startSeconds),
        "-i", sourcePath,
        "-t", String(durationSeconds),
        "-vf", scaleFilter,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-c:a", "aac",
        scaledPath,
      ]
    : [
        "-y",
        "-ss", String(startSeconds),
        "-i", sourcePath,
        "-f", "lavfi",
        "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-t", String(durationSeconds),
        "-vf", scaleFilter,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-c:a", "aac",
        "-shortest",
        scaledPath,
      ];
  await execFileAsync(FFMPEG_PATH, trimArgs);

  const relativeCaptions = captions
    .map((c) => ({
      start: Math.max(0, c.startSeconds - startSeconds),
      end: Math.min(durationSeconds, c.endSeconds - startSeconds),
      text: c.text,
    }))
    .filter((c) => c.end > c.start);

  if (relativeCaptions.length === 0) {
    await execFileAsync(FFMPEG_PATH, ["-y", "-i", scaledPath, "-c", "copy", outputPath]);
    return;
  }

  const overlayHeight = 420;
  const inputArgs: string[] = ["-y", "-i", scaledPath];
  const filterParts: string[] = [];
  let lastLabel = "0:v";

  for (let i = 0; i < relativeCaptions.length; i++) {
    const caption = relativeCaptions[i];
    const captionDuration = caption.end - caption.start;
    const pngPath = path.join(workDir, `auto-caption-${i}.png`);
    await writeFile(
      pngPath,
      await renderCaptionPng({ text: caption.text, fontSizePx: 64, color: "#ffffff" }, canvasWidth, overlayHeight)
    );
    inputArgs.push("-loop", "1", "-t", String(captionDuration), "-i", pngPath);
    const inputIndex = i + 1;
    const outLabel = `ov${i}`;
    filterParts.push(
      `[${lastLabel}][${inputIndex}:v]overlay=0:main_h-overlay_h-160:enable='between(t,${caption.start},${caption.end})'[${outLabel}]`
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
