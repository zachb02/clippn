/**
 * Parses a single-range `Range` header (bytes=N-M, bytes=N-, or the suffix
 * form bytes=-N) against a known file size. Returns null for anything
 * malformed, unsupported (multi-range), or unsatisfiable, so the caller can
 * fall back to a clean 416 rather than guessing a default that could either
 * serve the whole file under a 206 status or crash the stream constructor
 * on a reversed/out-of-bounds range.
 */
export function parseRange(rangeHeader: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d+)?-(\d+)?$/.exec(rangeHeader.trim());
  if (!match) return null;
  const [, startRaw, endRaw] = match;

  let start: number;
  let end: number;
  if (startRaw === undefined) {
    // Suffix range: last N bytes.
    if (endRaw === undefined) return null;
    const suffixLength = Number(endRaw);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(startRaw);
    end = endRaw !== undefined ? Number(endRaw) : size - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  end = Math.min(end, size - 1);
  if (start < 0 || start > end || start >= size) return null;
  return { start, end };
}
