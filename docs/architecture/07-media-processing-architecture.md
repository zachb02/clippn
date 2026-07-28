# Media Processing Architecture

## Principles

1. **AI providers and local media processors are architecturally separate.** An
   `AIProvider` never touches a video file directly; a `MediaProcessor` never calls an
   external AI API. This keeps "does this feature need a key" a structural property,
   not a runtime guess.
2. **No user input ever reaches a shell.** Every FFmpeg/FFprobe invocation is built as
   a structured argument array (`execFile`, not `exec`/shell string concatenation), so
   there is no command-injection surface regardless of filename, prompt text, or
   parameter content.
3. **Workers are sandboxed and resource-bounded**: CPU/memory limits, job timeouts,
   temp-file cleanup guaranteed via `finally`, no network egress from the media worker
   beyond the private storage backend.

## Pipeline (upload → proxy → operation → output)

```
Upload (signed URL) → private storage
        │
        ▼
inspectMedia()  ── ffprobe -show_format -show_streams -of json  (structured args)
        │
        ▼
Generate low-res proxy (for editor scrubbing performance)
        │
        ▼
Requested operation (trim / crop / compress / compose / extractAudio / normalizeAudio)
        │
        ▼
Write output to private storage under a new asset id
        │
        ▼
Clean up all temp files (guaranteed, even on error)
```

## Phase 1 implementation: `trim` and `crop`

```ts
// Structured args, never a template string. Example shape:
function buildTrimArgs(input: TrimInput): string[] {
  return [
    "-y",
    "-ss", String(input.startSeconds),
    "-i", input.sourcePath,        // absolute path inside the worker's sandboxed tmp dir
    "-t", String(input.durationSeconds),
    "-c", "copy",                  // lossless stream copy when keyframe-aligned
    input.outputPath,
  ];
}

function buildCropArgs(input: CropInput): string[] {
  const filter = `crop=${input.width}:${input.height}:${input.x}:${input.y}`;
  return ["-y", "-i", input.sourcePath, "-vf", filter, "-c:a", "copy", input.outputPath];
}
```

`sourcePath`/`outputPath` are always paths the server itself generated inside a
per-job temp directory — never derived from a user-supplied filename directly (the
original filename is sanitized and stored as metadata only, the on-disk name is a
generated id).

## Sandboxing

- Media workers run as a separate process/container with:
  - a read-only view of only the specific input asset(s) for the job,
  - a dedicated writable tmp directory, deleted after the job regardless of outcome,
  - CPU time and memory ulimits,
  - a hard wall-clock job timeout that cancels the ffmpeg child process.
- A future sandboxed Python worker (for local ML tasks — e.g. background removal
  models, stem separation) follows the identical isolation pattern: subprocess with an
  argument list, no shell, no network egress beyond storage.

## File validation before any processing

1. Check `Content-Length` / declared size against a hard limit.
2. Read the file's magic bytes / signature and confirm it matches the declared MIME
   type (do not trust the client's `Content-Type` header alone).
3. Run `ffprobe` and reject if it cannot parse the container, or if resolution/duration
   exceed configured caps (decompression-bomb / decoder-resource-exhaustion
   protection).
4. Sanitize the original filename for display (strip path separators, control
   characters) — it is never used as an on-disk path component.

## Proxy/thumbnail/waveform generation

Generated asynchronously as their own job type so the editor and dashboard can render
immediately with placeholders while the full-resolution asset is still processing —
this is what backs the "lazy asset loading" and "thumbnail strips" requirements in
later editor phases.
