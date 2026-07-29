import { execFile } from "child_process";
import { promisify } from "util";
import { readdir } from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);
const YTDLP_PATH = process.env.YTDLP_PATH || "yt-dlp";
const METADATA_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_FILESIZE = "2G";

const ALLOWED_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
// Real YouTube video ids are always exactly 11 characters from this
// alphabet -- anchored so a trailing/leading extra character can't sneak
// through, unlike a bare "has some non-empty path" check.
const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".m4v": "video/mp4",
};

export function mimeTypeForExtension(extension: string): string | null {
  return MIME_TYPE_BY_EXTENSION[extension.toLowerCase()] ?? null;
}

/**
 * Real URL parsing against an exact hostname allowlist, not a regex over
 * the raw string -- a regex like `/youtube\.com/` can be tricked by
 * `https://evil.com/?u=youtube.com/watch?v=x`. This is also the only
 * server-side "fetch a user-supplied URL" path in the app; restricting it
 * to YouTube's own hosts keeps it out of the general SSRF surface the
 * security model otherwise bans entirely. Also validates the video id
 * itself against YouTube's real 11-character id shape, not just "some
 * non-empty path/query value" -- `watch?v=`, `youtu.be/-`, and
 * `shorts/-` previously all passed as "valid".
 */
export function isValidYoutubeUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return false;
  }
  if (parsed.hostname === "youtu.be") {
    return VIDEO_ID_PATTERN.test(parsed.pathname.slice(1));
  }
  if (parsed.pathname === "/watch") {
    return VIDEO_ID_PATTERN.test(parsed.searchParams.get("v") ?? "");
  }
  const shortsMatch = /^\/shorts\/([\w-]+)$/.exec(parsed.pathname);
  return shortsMatch !== null && VIDEO_ID_PATTERN.test(shortsMatch[1]);
}

export interface YoutubeDownloadResult {
  sourcePath: string;
  title: string;
  mimeType: string | null;
}

/**
 * Downloads a YouTube video's bytes into jobDir via yt-dlp. Two separate
 * yt-dlp invocations, not one combined --print+download call: verified
 * directly against a real video during development that combining --print
 * with an actual download silently skips writing the file on the installed
 * yt-dlp version -- not documented as safe to combine, so this avoids it
 * rather than assuming it works.
 */
export async function downloadYoutubeVideo(url: string, jobDir: string): Promise<YoutubeDownloadResult> {
  if (!isValidYoutubeUrl(url)) {
    throw new Error("Enter a real youtube.com, youtu.be, or /shorts/ video URL.");
  }

  let title = "YouTube Import";
  try {
    const { stdout } = await execFileAsync(
      YTDLP_PATH,
      ["--no-playlist", "--skip-download", "--print", "%(title)s", url],
      { timeout: METADATA_TIMEOUT_MS }
    );
    const firstLine = stdout.split("\n")[0]?.trim();
    if (firstLine) title = firstLine;
  } catch {
    // Metadata lookup failing isn't fatal by itself -- the download call
    // below will surface a clear error if the video truly isn't reachable.
  }

  const outputTemplate = path.join(jobDir, "source.%(ext)s");
  try {
    await execFileAsync(
      YTDLP_PATH,
      ["--no-playlist", "-f", "best[ext=mp4]/best", "--max-filesize", MAX_FILESIZE, "-o", outputTemplate, url],
      { timeout: DOWNLOAD_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 }
    );
  } catch (error) {
    const stderr = (error as { stderr?: string } | null)?.stderr ?? "";
    if (stderr.includes("Private video")) throw new Error("This video is private and can't be imported.");
    if (stderr.includes("Sign in to confirm your age") || stderr.includes("age-restricted")) {
      throw new Error("This video is age-restricted and can't be imported.");
    }
    if (stderr.includes("nvailable")) {
      throw new Error("This video is unavailable (removed, region-blocked, or private).");
    }
    if (stderr.includes("max-filesize")) throw new Error("This video is too large to import.");
    throw new Error("Could not download this YouTube video.");
  }

  const files = await readdir(jobDir);
  const downloaded = files.find((f) => f.startsWith("source."));
  if (!downloaded) {
    throw new Error("Could not download this YouTube video.");
  }

  const sourcePath = path.join(jobDir, downloaded);
  return { sourcePath, title, mimeType: mimeTypeForExtension(path.extname(sourcePath)) };
}
