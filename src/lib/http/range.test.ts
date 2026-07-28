import { describe, expect, it } from "vitest";
import { parseRange } from "./range";

describe("parseRange", () => {
  const size = 213;

  it("parses a plain N-M range", () => {
    expect(parseRange("bytes=0-9", size)).toEqual({ start: 0, end: 9 });
  });

  it("parses an open-ended N- range as up to the last byte", () => {
    expect(parseRange("bytes=10-", size)).toEqual({ start: 10, end: size - 1 });
  });

  it("parses a suffix -N range as the last N bytes", () => {
    expect(parseRange("bytes=-5", size)).toEqual({ start: size - 5, end: size - 1 });
  });

  it("rejects a reversed range instead of producing start > end", () => {
    expect(parseRange("bytes=10-5", size)).toBeNull();
  });

  it("clamps an end far beyond the file size rather than erroring", () => {
    expect(parseRange("bytes=0-999999999999", size)).toEqual({ start: 0, end: size - 1 });
  });

  it("rejects a header that only superficially contains 'bytes=' (unanchored match)", () => {
    expect(parseRange("notbytes=3-4", size)).toBeNull();
  });

  it("rejects non-numeric bounds", () => {
    expect(parseRange("bytes=abc-def", size)).toBeNull();
  });

  it("rejects multi-range requests (unsupported, not silently mis-parsed)", () => {
    expect(parseRange("bytes=0-1,4-5", size)).toBeNull();
  });

  it("rejects a start at or beyond the file size", () => {
    expect(parseRange(`bytes=${size}-${size + 10}`, size)).toBeNull();
  });

  it("rejects an empty range header", () => {
    expect(parseRange("bytes=-", size)).toBeNull();
  });
});
