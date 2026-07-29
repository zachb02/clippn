import { readFile } from "fs/promises";
import path from "path";

// The base64 payload group requires full 4-character quartets with only
// the last quartet allowed to carry padding ("=" or "==") -- a looser
// charset-only check (e.g. `[A-Za-z0-9+/]*={0,2}`) still accepts
// non-quartet lengths like "AAAAA" or wrongly-padded strings like "AAAA=",
// which Node's permissive decoder then silently turns into a truncated,
// wrong buffer instead of erroring.
const DATA_URL_PATTERN = /^data:([\w.+-]+)\/([\w.+-]+);base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/i;

const EXTENSION_KIND: Record<string, "audio" | "image"> = {
  ".mp3": "audio",
  ".wav": "audio",
  ".m4a": "audio",
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".webp": "image",
};

/**
 * A provider adapter's generated-media URL (image or audio) is always one
 * of two shapes in this app: a data: URL (the real bytes, base64-encoded --
 * every adapter that generates media server-side returns this, since
 * fetching a URL server-side is the SSRF surface this app avoids) or a
 * same-origin static path under public/ (only the Mock Provider's
 * placeholder assets). Never a raw remote URL -- nothing in this codebase
 * fetches one.
 *
 * audioUrl/imageUrl come from a provider adapter, not the requesting user
 * directly, but a misbehaving or future adapter is still an untrusted
 * boundary:
 * - the declared mime type (data: URL) or file extension (same-origin
 *   path) is checked against `expectedKind` ("audio" or "image"), so a
 *   mislabeled or wrong-shaped payload is rejected instead of silently
 *   flowing downstream as the wrong media type;
 * - the base64 payload is validated against real base64 quartet/padding
 *   rules before decoding, so malformed input is rejected outright instead
 *   of Node's permissive decoder silently producing a truncated, wrong
 *   buffer;
 * - the same-origin path form is resolved and required to stay contained
 *   within public/, the same defense-in-depth pattern as
 *   resolveStoragePath.
 */
export async function resolveGeneratedMediaBuffer(url: string, expectedKind: "audio" | "image"): Promise<Buffer> {
  const dataUrlMatch = DATA_URL_PATTERN.exec(url);
  if (dataUrlMatch) {
    const mimeKind = dataUrlMatch[1]?.toLowerCase();
    if (mimeKind !== expectedKind) {
      throw new Error(`Expected ${expectedKind} data but got "${mimeKind}".`);
    }
    const buffer = Buffer.from(dataUrlMatch[3] ?? "", "base64");
    if (buffer.length === 0) {
      throw new Error("The generated media was empty.");
    }
    return buffer;
  }

  const publicRoot = path.join(process.cwd(), "public");
  const resolvedPath = path.resolve(publicRoot, `.${url}`);
  if (!url.startsWith("/") || (resolvedPath !== publicRoot && !resolvedPath.startsWith(publicRoot + path.sep))) {
    throw new Error("This provider's generated media format isn't supported yet.");
  }
  if (EXTENSION_KIND[path.extname(url).toLowerCase()] !== expectedKind) {
    throw new Error(`Expected ${expectedKind} data but got a different file type.`);
  }
  return readFile(resolvedPath);
}
