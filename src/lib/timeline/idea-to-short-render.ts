import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { renderCaptionPng } from "./render";

const execFileAsync = promisify(execFile);
const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";

export interface IdeaToShortCaption {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface RenderIdeaToShortInput {
  backgroundImagePath: string;
  audioPath: string;
  outputPath: string;
  workDir: string;
  durationSeconds: number;
  /** Real transcript segments from the generated voiceover -- never
   * LLM-invented, the same principle as Auto Clip's captions. */
  captions: IdeaToShortCaption[];
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * Composites a single still background image + a voiceover audio track
 * into a vertical video, then burns in the real transcript captions --
 * reusing the exact sharp/SVG + FFmpeg `overlay` technique from the
 * timeline renderer, the same way Auto Clip's segment renderer does,
 * rather than a third reimplementation of caption compositing.
 */
export async function renderIdeaToShort(input: RenderIdeaToShortInput): Promise<void> {
  const { backgroundImagePath, audioPath, outputPath, workDir, durationSeconds, captions } = input;
  const canvasWidth = input.canvasWidth ?? 1080;
  const canvasHeight = input.canvasHeight ?? 1920;
  if (durationSeconds <= 0) {
    throw new Error("Duration must be positive.");
  }

  await mkdir(workDir, { recursive: true });

  // Fills the vertical frame edge-to-edge (aspect-preserving upscale +
  // centered crop), the same reframing approach Auto Clip uses, rather
  // than letterboxing a still image that likely isn't already 9:16.
  const scaleFilter = `scale=${canvasWidth}:${canvasHeight}:force_original_aspect_ratio=increase,crop=${canvasWidth}:${canvasHeight},setsar=1`;
  const basePath = path.join(workDir, "base.mp4");
  await execFileAsync(FFMPEG_PATH, [
    "-y",
    "-loop", "1",
    "-i", backgroundImagePath,
    "-i", audioPath,
    "-t", String(durationSeconds),
    "-vf", scaleFilter,
    "-r", "30",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-c:a", "aac",
    "-shortest",
    "-pix_fmt", "yuv420p",
    basePath,
  ]);

  if (captions.length === 0) {
    await execFileAsync(FFMPEG_PATH, ["-y", "-i", basePath, "-c", "copy", outputPath]);
    return;
  }

  const overlayHeight = 420;
  const inputArgs: string[] = ["-y", "-i", basePath];
  const filterParts: string[] = [];
  let lastLabel = "0:v";

  for (let i = 0; i < captions.length; i++) {
    const caption = captions[i];
    const captionDuration = Math.max(0.1, caption.endSeconds - caption.startSeconds);
    const pngPath = path.join(workDir, `caption-${i}.png`);
    await writeFile(
      pngPath,
      await renderCaptionPng({ text: caption.text, fontSizePx: 56, color: "#ffffff" }, canvasWidth, overlayHeight)
    );
    inputArgs.push("-loop", "1", "-t", String(captionDuration), "-i", pngPath);
    const inputIndex = i + 1;
    const outLabel = `ov${i}`;
    // Nudge the enable-end down a hair so back-to-back captions don't
    // both render on their shared boundary frame (between() is inclusive).
    const enableEnd = Math.max(caption.startSeconds, caption.endSeconds - 0.01);
    filterParts.push(
      `[${lastLabel}][${inputIndex}:v]overlay=0:main_h-overlay_h-160:enable='between(t,${caption.startSeconds},${enableEnd})'[${outLabel}]`
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
