import { readFile } from "fs/promises";
import path from "path";

const DATA_URL_PATTERN = /^data:[\w.+-]+\/[\w.+-]+;base64,(.+)$/i;

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
 * boundary -- the same-origin path form is resolved and required to stay
 * contained within public/, the same defense-in-depth pattern as
 * resolveStoragePath.
 */
export async function resolveGeneratedMediaBuffer(url: string): Promise<Buffer> {
  const dataUrlMatch = DATA_URL_PATTERN.exec(url);
  if (dataUrlMatch) {
    const buffer = Buffer.from(dataUrlMatch[1], "base64");
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
  return readFile(resolvedPath);
}
