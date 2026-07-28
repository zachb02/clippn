import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE_PATH = process.env.FFPROBE_PATH || "ffprobe";

const MAX_DURATION_SECONDS = 60 * 30; // 30 min decompression-bomb guard
const MAX_DIMENSION_PX = 7680; // 8K guard

export interface MediaMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  hasAudio: boolean;
  formatName: string;
}

interface FfprobeStream {
  codec_type: "video" | "audio" | string;
  width?: number;
  height?: number;
}

interface FfprobeOutput {
  format: { duration?: string; format_name?: string };
  streams: FfprobeStream[];
}

/**
 * Every ffprobe/ffmpeg invocation below uses execFile with a structured
 * argument array -- never a shell string -- so no filename, parameter, or
 * user input can ever be interpreted as a shell command. See
 * docs/architecture/07-media-processing-architecture.md.
 */
export async function inspectMedia(sourcePath: string): Promise<MediaMetadata> {
  const { stdout } = await execFileAsync(FFPROBE_PATH, [
    "-v", "error",
    "-show_format",
    "-show_streams",
    "-of", "json",
    sourcePath,
  ]);

  const parsed = JSON.parse(stdout) as FfprobeOutput;
  const videoStream = parsed.streams.find((s) => s.codec_type === "video");
  const hasAudio = parsed.streams.some((s) => s.codec_type === "audio");
  const durationSeconds = Number(parsed.format.duration ?? 0);
  const width = videoStream?.width ?? 0;
  const height = videoStream?.height ?? 0;

  if (!videoStream || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Could not read this file as a video (unrecognized or corrupt container).");
  }
  if (durationSeconds > MAX_DURATION_SECONDS) {
    throw new Error(`Video is too long (max ${MAX_DURATION_SECONDS / 60} minutes for this tool).`);
  }
  if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
    throw new Error("Video resolution exceeds the supported maximum.");
  }

  return {
    durationSeconds,
    width,
    height,
    hasAudio,
    formatName: parsed.format.format_name ?? "unknown",
  };
}

export interface TrimInput {
  sourcePath: string;
  outputPath: string;
  startSeconds: number;
  durationSeconds: number;
}

export async function trim(input: TrimInput): Promise<void> {
  await execFileAsync(FFMPEG_PATH, [
    "-y",
    "-ss", String(input.startSeconds),
    "-i", input.sourcePath,
    "-t", String(input.durationSeconds),
    "-c", "copy",
    input.outputPath,
  ]);
}

export interface CropInput {
  sourcePath: string;
  outputPath: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function crop(input: CropInput): Promise<void> {
  const filter = `crop=${input.width}:${input.height}:${input.x}:${input.y}`;
  await execFileAsync(FFMPEG_PATH, [
    "-y",
    "-i", input.sourcePath,
    "-vf", filter,
    "-c:a", "copy",
    input.outputPath,
  ]);
}

export interface GenericMediaMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  hasVideo: boolean;
  hasAudio: boolean;
  formatName: string;
  bitRate: number | null;
}

/**
 * Like inspectMedia, but doesn't require a video stream -- used by tools
 * that also accept audio-only input (converter, video-to-audio, balancer).
 */
export async function probeMedia(sourcePath: string): Promise<GenericMediaMetadata> {
  const { stdout } = await execFileAsync(FFPROBE_PATH, [
    "-v", "error",
    "-show_format",
    "-show_streams",
    "-of", "json",
    sourcePath,
  ]);

  const parsed = JSON.parse(stdout) as FfprobeOutput & { format: { bit_rate?: string } };
  const videoStream = parsed.streams.find((s) => s.codec_type === "video");
  const hasAudio = parsed.streams.some((s) => s.codec_type === "audio");
  const durationSeconds = Number(parsed.format.duration ?? 0);

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Could not read this file as media (unrecognized or corrupt container).");
  }
  if (durationSeconds > MAX_DURATION_SECONDS) {
    throw new Error(`File is too long (max ${MAX_DURATION_SECONDS / 60} minutes for this tool).`);
  }
  const width = videoStream?.width ?? 0;
  const height = videoStream?.height ?? 0;
  if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
    throw new Error("Video resolution exceeds the supported maximum.");
  }

  return {
    durationSeconds,
    width,
    height,
    hasVideo: Boolean(videoStream),
    hasAudio,
    formatName: parsed.format.format_name ?? "unknown",
    bitRate: parsed.format.bit_rate ? Number(parsed.format.bit_rate) : null,
  };
}

export interface CompressInput {
  sourcePath: string;
  outputPath: string;
  /** Constant Rate Factor: lower = higher quality/larger file. 18-28 is a sane range. */
  crf: number;
}

export async function compress(input: CompressInput): Promise<void> {
  await execFileAsync(FFMPEG_PATH, [
    "-y",
    "-i", input.sourcePath,
    "-c:v", "libx264",
    "-crf", String(input.crf),
    "-preset", "medium",
    "-c:a", "aac",
    "-b:a", "128k",
    input.outputPath,
  ]);
}

export interface ExtractAudioInput {
  sourcePath: string;
  outputPath: string;
  format: "mp3" | "wav" | "aac";
}

const AUDIO_CODEC_BY_FORMAT: Record<ExtractAudioInput["format"], string> = {
  mp3: "libmp3lame",
  wav: "pcm_s16le",
  aac: "aac",
};

export async function extractAudio(input: ExtractAudioInput): Promise<void> {
  await execFileAsync(FFMPEG_PATH, [
    "-y",
    "-i", input.sourcePath,
    "-vn",
    "-c:a", AUDIO_CODEC_BY_FORMAT[input.format],
    input.outputPath,
  ]);
}

export interface ConvertAudioInput {
  sourcePath: string;
  outputPath: string;
  format: "mp3" | "wav" | "aac";
}

export async function convertAudio(input: ConvertAudioInput): Promise<void> {
  await execFileAsync(FFMPEG_PATH, [
    "-y",
    "-i", input.sourcePath,
    "-c:a", AUDIO_CODEC_BY_FORMAT[input.format],
    input.outputPath,
  ]);
}

export interface NormalizeAudioInput {
  sourcePath: string;
  outputPath: string;
  /** Target integrated loudness in LUFS. -14 matches common streaming platform targets. */
  targetLufs: number;
}

export async function normalizeAudio(input: NormalizeAudioInput): Promise<void> {
  const filter = `loudnorm=I=${input.targetLufs}:TP=-1.5:LRA=11`;
  await execFileAsync(FFMPEG_PATH, [
    "-y",
    "-i", input.sourcePath,
    "-af", filter,
    input.outputPath,
  ]);
}
