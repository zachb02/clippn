import { NextResponse } from "next/server";
import { z } from "zod";
import { mkdtemp, rm, writeFile, readFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { getProvider } from "@/lib/ai/registry";
import { getDefaultTranscriptionModelId, getDefaultTextModelId } from "@/lib/ai/default-models";
import { resolveCredential } from "@/lib/credentials/resolve-credential";
import { saveAsset, deleteAsset } from "@/lib/storage/local-storage";
import { inspectMedia } from "@/lib/media/ffmpeg";
import { renderAutoClipSegment } from "@/lib/timeline/auto-clip-render";
import { parseAutoClipHighlights } from "@/lib/schemas/auto-clip";

const ConnectionIdSchema = z.string().uuid();

// Bounding the pipeline's own cost/time, independent of what the model
// returns: at most this many highlights actually get rendered, and each
// clip is clamped to a sane on-screen length even if the model hallucinates
// a range far outside these bounds.
const MAX_CLIPS_RENDERED = 5;
const MIN_CLIP_SECONDS = 5;
const MAX_CLIP_SECONDS = 90;
// Keeps the highlight-selection prompt bounded for very long transcripts --
// still representative, since Whisper segments are short and this covers
// a substantial portion of a typical short/mid-length video.
const MAX_TRANSCRIPT_CHARS = 12_000;

interface GeneratedClip {
  assetId: string;
  title: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
}

/**
 * Thrown for every "expected" failure inside the pipeline (bad input,
 * nothing transcribable, no valid clips, ...) instead of returning a
 * response directly from inside the try block. Every failure -- expected or
 * not -- must go through the same catch block so the same rollback always
 * runs; a `return` from inside `try` would skip it.
 */
class AutoClipError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function POST(request: Request) {
  const userId = await getOrCreateLocalUserId();

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const connectionIdRaw = formData?.get("connectionId");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No video file provided." }, { status: 400 });
  }
  const parsedConnectionId = ConnectionIdSchema.safeParse(connectionIdRaw);
  if (!parsedConnectionId.success) {
    return NextResponse.json({ error: "Select a provider connection." }, { status: 400 });
  }
  const connectionId = parsedConnectionId.data;

  const credential = await resolveCredential(connectionId, userId);
  if (!credential) {
    return NextResponse.json({ error: "That provider connection isn't available. Reconnect it and try again." }, { status: 422 });
  }
  const provider = getProvider(credential.provider);
  if (!provider.transcribeAudio || !provider.generateText) {
    return NextResponse.json({ error: "This provider doesn't support transcription and text generation, both required for Auto Clip." }, { status: 422 });
  }

  let projectId: string | null = null;
  let sourceStoragePath: string | null = null;
  const generatedStoragePaths: string[] = [];
  const jobDir = await mkdtemp(path.join(tmpdir(), "clippn-auto-clip-"));

  try {
    const sourceExtension = path.extname(file.name).slice(0, 10) || ".mp4";
    const sourcePath = path.join(jobDir, `source${sourceExtension}`);
    const sourceBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(sourcePath, sourceBuffer);

    // Real validation: ffprobe on the actual bytes, not the declared
    // filename/MIME. Also enforces the existing duration/resolution caps.
    const metadata = await inspectMedia(sourcePath);
    if (!metadata.hasAudio) {
      throw new AutoClipError(422, "This video has no audio track to transcribe.");
    }

    const [project] = await query<{ id: string }>(
      `insert into projects (user_id, title, workflow, status)
       values ($1, $2, 'auto-clip', 'transcribing')
       returning id`,
      [userId, file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Auto Clip"]
    );
    if (!project) {
      throw new AutoClipError(500, "Could not create a project for this clip.");
    }
    projectId = project.id;

    const savedSource = await saveAsset(projectId, sourceBuffer, file.name);
    sourceStoragePath = savedSource.storagePath;
    await query(
      `insert into assets
         (user_id, project_id, kind, storage_path, original_filename, mime_type, byte_size,
          duration_seconds, width, height, source)
       values ($1, $2, 'video', $3, $4, $5, $6, $7, $8, $9, 'upload')`,
      [
        userId,
        projectId,
        sourceStoragePath,
        file.name.replace(/[/\\]/g, "_").slice(0, 255),
        file.type || null,
        file.size,
        metadata.durationSeconds,
        metadata.width || null,
        metadata.height || null,
      ]
    );

    // Real transcription of the actual uploaded bytes -- never fetched from
    // a URL, read directly from this request's own temp file.
    const transcript = await provider.transcribeAudio(
      {
        audioUrl: sourcePath,
        modelId: getDefaultTranscriptionModelId(credential.provider),
        durationSeconds: metadata.durationSeconds,
      },
      credential
    );

    if (transcript.segments.length === 0) {
      throw new AutoClipError(422, "Couldn't transcribe any speech in this video to find clip-worthy moments.");
    }

    await query(`update projects set status = 'generating' where id = $1`, [projectId]);

    const transcriptForPrompt = transcript.segments
      .map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`)
      .join("\n")
      .slice(0, MAX_TRANSCRIPT_CHARS);

    const prompt = `You are selecting the most compelling short-form clip moments from a longer video's transcript. Each transcript line is prefixed with its [start-end] time in seconds.

Transcript:
${transcriptForPrompt}

Return ONLY a JSON array (no prose, no markdown fences) of up to 5 clip candidates, ordered by how compelling they are. Each item must be: {"startSeconds": number, "endSeconds": number, "title": string}. startSeconds and endSeconds must be real timestamps taken from the transcript above. Each clip should be between ${MIN_CLIP_SECONDS} and ${MAX_CLIP_SECONDS} seconds long and capture a self-contained, engaging moment (a hook, a punchline, a strong claim, an emotional beat). title should be a short, punchy caption for the clip (under 80 characters).`;

    const textResult = await provider.generateText(
      { prompt, modelId: getDefaultTextModelId(credential.provider) },
      credential
    );

    let highlights;
    try {
      highlights = parseAutoClipHighlights(textResult.text);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not parse the AI's clip selection.";
      throw new AutoClipError(502, message);
    }

    const clips: GeneratedClip[] = [];
    const candidates = highlights.slice(0, MAX_CLIPS_RENDERED);

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      // Clamp against reality without inventing a different range: only
      // trim the candidate's own span down to fit inside the video and
      // under MAX_CLIP_SECONDS. If what's left doesn't reach
      // MIN_CLIP_SECONDS, skip it -- never substitute an unrelated window
      // elsewhere in the video just to hit a minimum length.
      if (candidate.startSeconds >= metadata.durationSeconds) continue;
      const startSeconds = Math.max(0, candidate.startSeconds);
      const cappedEnd = Math.min(candidate.endSeconds, metadata.durationSeconds, startSeconds + MAX_CLIP_SECONDS);
      if (cappedEnd - startSeconds < MIN_CLIP_SECONDS) continue;
      const endSeconds = cappedEnd;

      const overlappingCaptions = transcript.segments
        .filter((s) => s.end > startSeconds && s.start < endSeconds)
        .map((s) => ({ startSeconds: s.start, endSeconds: s.end, text: s.text }));

      const clipWorkDir = path.join(jobDir, `clip-${i}`);
      const renderedPath = path.join(clipWorkDir, "output.mp4");
      await renderAutoClipSegment({
        sourcePath,
        outputPath: renderedPath,
        workDir: clipWorkDir,
        startSeconds,
        endSeconds,
        captions: overlappingCaptions,
      });

      // Verify the render actually produced a playable file before saving
      // it as a real asset -- not just "ffmpeg exited 0."
      const renderedMetadata = await inspectMedia(renderedPath);
      const renderedBuffer = await readFile(renderedPath);
      const saved = await saveAsset(projectId, renderedBuffer, `${candidate.title.slice(0, 40)}.mp4`);
      generatedStoragePaths.push(saved.storagePath);

      const [asset] = await query<{ id: string }>(
        `insert into assets
           (user_id, project_id, kind, storage_path, original_filename, mime_type, byte_size,
            duration_seconds, width, height, source)
         values ($1, $2, 'video', $3, $4, 'video/mp4', $5, $6, $7, $8, 'generated')
         returning id`,
        [
          userId,
          projectId,
          saved.storagePath,
          `${candidate.title.slice(0, 40)}.mp4`,
          renderedBuffer.byteLength,
          renderedMetadata.durationSeconds,
          renderedMetadata.width || null,
          renderedMetadata.height || null,
        ]
      );
      if (!asset) continue;

      clips.push({
        assetId: asset.id,
        title: candidate.title,
        startSeconds,
        endSeconds,
        durationSeconds: endSeconds - startSeconds,
      });
    }

    if (clips.length === 0) {
      throw new AutoClipError(422, "Couldn't generate any valid clips from this video.");
    }

    await query(`update projects set status = 'completed' where id = $1`, [projectId]);

    return NextResponse.json({ projectId, clips }, { status: 201 });
  } catch (error) {
    // Roll back anything already written, permanent storage or database --
    // a failed Auto Clip run shouldn't leave orphaned files or dangling
    // rows behind. Delete the asset rows before the project: assets.
    // project_id is ON DELETE SET NULL, not CASCADE, so deleting the
    // project first would leave orphaned asset rows (project_id nulled)
    // still pointing at files this same block is about to delete.
    if (projectId) {
      await query(`delete from assets where project_id = $1`, [projectId]).catch(() => {});
      await query(`delete from projects where id = $1`, [projectId]).catch(() => {});
    }
    for (const storagePath of generatedStoragePaths) {
      await deleteAsset(storagePath);
    }
    if (sourceStoragePath) {
      await deleteAsset(sourceStoragePath);
    }
    if (error instanceof AutoClipError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Could not generate clips from this video.";
    return NextResponse.json({ error: message }, { status: 422 });
  } finally {
    await rm(jobDir, { recursive: true, force: true });
  }
}
