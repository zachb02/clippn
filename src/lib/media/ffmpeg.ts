import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE_PATH = process.env.FFPROBE_PATH || "ffprobe";

const MAX_DURATION_SECONDS = 60 * 30; // 30 min decompression-bomb guard
const MAX_DIMENSION_PX = 7680; // 8K guard

// Playlist/reference-style demuxers (HLS, DASH, concat, RTSP/RTP/SDP, the
// subfile pseudo-protocol) can make FFmpeg open a file or network resource
// that isn't the one the caller passed in at all -- verified directly: an
// uploaded .m3u8 renamed to look like a video, containing a
// `file:///absolute/path` segment reference, made ffprobe transparently
// read and report metadata for that *other* file. Every route in this
// codebase probes a file with inspectMedia/probeMedia before ever encoding
// it, so rejecting these format names here closes the vulnerability at the
// one shared choke point every media tool already passes through, rather
// than duplicating the check per-route.
const BANNED_FORMAT_SUBSTRINGS = ["hls", "applehttp", "dash", "concat", "rtsp", "rtp", "sdp", "subfile", "mms"];

function assertSafeFormat(formatName: string): void {
  const lower = formatName.toLowerCase();
  if (BANNED_FORMAT_SUBSTRINGS.some((banned) => lower.includes(banned))) {
    throw new Error("This file's format isn't supported (playlist/reference-style containers are rejected for safety).");
  }
}

// Complementary hardening: even for formats not on the substring blocklist,
// don't let FFmpeg follow a reference to a network resource -- only local
// file/pipe access is ever legitimate for an uploaded file.
const SAFE_PROTOCOL_ARGS = ["-protocol_whitelist", "file,pipe,crypto,data"];

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
    ...SAFE_PROTOCOL_ARGS,
    "-show_format",
    "-show_streams",
    "-of", "json",
    sourcePath,
  ]);

  const parsed = JSON.parse(stdout) as FfprobeOutput;
  assertSafeFormat(parsed.format.format_name ?? "");
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
    ...SAFE_PROTOCOL_ARGS,
    "-show_format",
    "-show_streams",
    "-of", "json",
    sourcePath,
  ]);

  const parsed = JSON.parse(stdout) as FfprobeOutput & { format: { bit_rate?: string } };
  assertSafeFormat(parsed.format.format_name ?? "");
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

export interface EnhanceSpeechInput {
  sourcePath: string;
  outputPath: string;
  /** Noise reduction strength in dB (afftdn's `nr`). Higher = more aggressive. */
  strength: number;
}

/**
 * Real FFT-based noise reduction (afftdn) followed by a gentle high-pass to
 * cut low-frequency room rumble -- not a placeholder, an actual DSP chain
 * that measurably reduces steady background noise (hiss, fan noise, hum).
 */
export async function enhanceSpeech(input: EnhanceSpeechInput): Promise<void> {
  const filter = `highpass=f=80,afftdn=nr=${input.strength}:nf=-25`;
  await execFileAsync(FFMPEG_PATH, [
    "-y",
    "-i", input.sourcePath,
    "-af", filter,
    input.outputPath,
  ]);
}

export interface SplitScreenInput {
  topPath: string;
  bottomPath: string;
  outputPath: string;
  /** vertical = top/bottom stack (the usual shorts layout); horizontal = side by side. */
  layout: "vertical" | "horizontal";
  audioSource: "top" | "bottom";
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * Combines two video sources into one canvas (aspect-preserving upscale +
 * centered crop per half, the same reframing technique used everywhere
 * else in this codebase) and stacks them with a single real FFmpeg
 * filter_complex call. Audio comes from exactly one chosen source --
 * `?` on the map is FFmpeg's own "map this stream if it exists, otherwise
 * skip silently" syntax, so a source with no audio just produces a silent
 * output rather than a crash.
 */
export async function renderSplitScreen(input: SplitScreenInput): Promise<void> {
  const canvasWidth = input.canvasWidth ?? 1080;
  const canvasHeight = input.canvasHeight ?? 1920;
  const cellWidth = input.layout === "horizontal" ? Math.floor(canvasWidth / 2) : canvasWidth;
  const cellHeight = input.layout === "vertical" ? Math.floor(canvasHeight / 2) : canvasHeight;

  // `-shortest` only trims based on the mapped streams' own packet
  // timestamps -- once vstack/hstack has already merged two inputs of
  // different lengths into a single [v] stream, there's nothing left for
  // `-shortest` to compare, and the merged filter just holds/repeats the
  // shorter source's last frame instead of truncating (verified directly:
  // an 8s + 5s pair produced an 8s output, not 5s). Two layers of fix:
  // container-level -t as a coarse trim (probeMedia's duration is
  // container-level and can be skewed by a longer non-video stream), plus
  // vstack/hstack's own `shortest=1` option so the stack filter itself
  // stops at whichever of its two video inputs actually runs out of
  // frames first, regardless of container-level duration accuracy.
  const [topMeta, bottomMeta] = await Promise.all([probeMedia(input.topPath), probeMedia(input.bottomPath)]);
  const durationSeconds = Math.min(topMeta.durationSeconds, bottomMeta.durationSeconds);

  const scale = (index: number, label: string) =>
    `[${index}:v]scale=${cellWidth}:${cellHeight}:force_original_aspect_ratio=increase,crop=${cellWidth}:${cellHeight},setsar=1[${label}]`;

  const stackFilter =
    input.layout === "vertical" ? "[top][bottom]vstack=inputs=2:shortest=1[v]" : "[top][bottom]hstack=inputs=2:shortest=1[v]";
  const filterComplex = [scale(0, "top"), scale(1, "bottom"), stackFilter].join(";");
  const audioMap = input.audioSource === "top" ? "0:a?" : "1:a?";

  await execFileAsync(FFMPEG_PATH, [
    "-y",
    ...SAFE_PROTOCOL_ARGS,
    "-i", input.topPath,
    "-i", input.bottomPath,
    "-filter_complex", filterComplex,
    "-map", "[v]",
    "-map", audioMap,
    "-t", String(durationSeconds),
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    input.outputPath,
  ]);
}
