import { NextResponse } from "next/server";
import { mkdtemp, rm, writeFile, readFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { IdeaToShortRequestSchema } from "@/lib/schemas/idea-to-short";
import { getProvider } from "@/lib/ai/registry";
import {
  getDefaultTextModelId,
  getDefaultSpeechModelId,
  getDefaultImageModelId,
  getDefaultTranscriptionModelId,
} from "@/lib/ai/default-models";
import { resolveCredential } from "@/lib/credentials/resolve-credential";
import { resolveGeneratedMediaBuffer } from "@/lib/ai/resolve-generated-media";
import { saveAsset, deleteAsset } from "@/lib/storage/local-storage";
import { inspectMedia, probeMedia } from "@/lib/media/ffmpeg";
import { renderIdeaToShort } from "@/lib/timeline/idea-to-short-render";

// This is a local, single-user app with no distributed rate limiter --
// see the same reasoning in the Auto Clip route. A simple in-process cap
// stops several concurrent multi-step generation pipelines from piling up
// on the user's own machine.
const MAX_CONCURRENT_JOBS = 2;
let activeJobs = 0;

class IdeaToShortError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function POST(request: Request) {
  const userId = await getOrCreateLocalUserId();

  const body = await request.json().catch(() => null);
  const parsed = IdeaToShortRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { connectionId, topic } = parsed.data;

  const credential = await resolveCredential(connectionId, userId);
  if (!credential) {
    return NextResponse.json({ error: "That provider connection isn't available. Reconnect it and try again." }, { status: 422 });
  }
  const provider = getProvider(credential.provider);
  if (!provider.generateText || !provider.synthesizeSpeech || !provider.generateImage || !provider.transcribeAudio) {
    return NextResponse.json(
      { error: "This provider doesn't support the full Idea-to-Short pipeline (text, speech, image, and transcription)." },
      { status: 422 }
    );
  }

  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    return NextResponse.json(
      { error: "Too many generation jobs are already running. Wait for one to finish and try again." },
      { status: 429 }
    );
  }
  activeJobs++;

  let projectId: string | null = null;
  let jobDir: string | null = null;
  const savedStoragePaths: string[] = [];

  try {
    // mkdtemp must run inside the try -- it used to run before it, so a
    // failure here (disk full, permissions) would skip the finally below
    // entirely and permanently leak this activeJobs slot, eventually
    // forcing every request to 429 forever.
    jobDir = await mkdtemp(path.join(tmpdir(), "clippn-idea-to-short-"));
    const [project] = await query<{ id: string }>(
      `insert into projects (user_id, title, workflow, status)
       values ($1, $2, 'idea-to-short', 'generating')
       returning id`,
      [userId, topic.slice(0, 120)]
    );
    if (!project) {
      throw new IdeaToShortError(500, "Could not create a project for this idea.");
    }
    projectId = project.id;

    const scriptPrompt = `Write a punchy, natural-sounding short-form video narration script about: ${topic}. Keep it under 100 words. Return ONLY the spoken narration text -- no headers, stage directions, or formatting.`;
    const scriptResult = await provider.generateText(
      { prompt: scriptPrompt, modelId: getDefaultTextModelId(credential.provider) },
      credential
    );
    const script = scriptResult.text.trim();
    if (!script) {
      throw new IdeaToShortError(502, "Could not generate a narration script for this idea.");
    }

    const speech = await provider.synthesizeSpeech(
      { text: script, modelId: getDefaultSpeechModelId(credential.provider) },
      credential
    );
    const audioBuffer = await resolveGeneratedMediaBuffer(speech.audioUrl, "audio");
    const audioPath = path.join(jobDir, "voiceover.mp3");
    await writeFile(audioPath, audioBuffer);
    const audioMetadata = await probeMedia(audioPath);
    if (!audioMetadata.hasAudio) {
      throw new IdeaToShortError(502, "The generated voiceover had no audio.");
    }

    // Captions come from transcribing the actual generated narration audio
    // -- never LLM-invented -- for any real provider (OpenAI's whisper-1
    // genuinely transcribes the bytes at audioPath). The Mock Provider is
    // the one exception: its transcribeAudio doesn't read audioPath at all
    // (see mock-provider.ts), so in Mock mode these captions are equally
    // fabricated placeholder text as everything else Mock returns -- that's
    // inherent to what Mock mode is (simulated success, not real work),
    // not a bug specific to this pipeline.
    const transcript = await provider.transcribeAudio(
      { audioUrl: audioPath, modelId: getDefaultTranscriptionModelId(credential.provider), durationSeconds: audioMetadata.durationSeconds },
      credential
    );

    const imagePrompt = `A cinematic, high quality vertical background image representing: ${topic}. No text, no words, no logos, no captions.`;
    const image = await provider.generateImage(
      { prompt: imagePrompt, modelId: getDefaultImageModelId(credential.provider) },
      credential
    );
    const imageBuffer = await resolveGeneratedMediaBuffer(image.imageUrl, "image");
    const imagePath = path.join(jobDir, "background.png");
    await writeFile(imagePath, imageBuffer);

    const outputPath = path.join(jobDir, "output.mp4");
    await renderIdeaToShort({
      backgroundImagePath: imagePath,
      audioPath,
      outputPath,
      workDir: jobDir,
      durationSeconds: audioMetadata.durationSeconds,
      captions: transcript.segments.map((s) => ({ startSeconds: s.start, endSeconds: s.end, text: s.text })),
    });

    // Verify the render actually produced a playable file before saving
    // it as a real asset -- not just "ffmpeg exited 0."
    const renderedMetadata = await inspectMedia(outputPath);
    const renderedBuffer = await readFile(outputPath);
    const saved = await saveAsset(projectId, renderedBuffer, `${topic.slice(0, 40)}.mp4`);
    savedStoragePaths.push(saved.storagePath);

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
        `${topic.slice(0, 40)}.mp4`,
        renderedBuffer.byteLength,
        renderedMetadata.durationSeconds,
        renderedMetadata.width || null,
        renderedMetadata.height || null,
      ]
    );
    if (!asset) {
      throw new IdeaToShortError(500, "Could not save the generated video.");
    }

    await query(`update projects set status = 'completed' where id = $1`, [projectId]);

    return NextResponse.json(
      {
        projectId,
        assetId: asset.id,
        script,
        durationSeconds: renderedMetadata.durationSeconds,
        mock: speech.mock === true || scriptResult.mock === true || image.mock === true,
      },
      { status: 201 }
    );
  } catch (error) {
    // Same rollback discipline as Auto Clip: every failure routes through
    // here (no early `return` inside the try block), and asset rows are
    // deleted before the project row since assets.project_id is
    // ON DELETE SET NULL, not CASCADE.
    if (projectId) {
      await query(`delete from assets where project_id = $1`, [projectId]).catch(() => {});
      await query(`delete from projects where id = $1`, [projectId]).catch(() => {});
    }
    for (const storagePath of savedStoragePaths) {
      await deleteAsset(storagePath);
    }
    if (error instanceof IdeaToShortError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    let message = error instanceof Error ? error.message : "Could not generate this video.";
    try {
      message = provider.normalizeError(error).message;
    } catch {
      // fall through to the message derived above
    }
    return NextResponse.json({ error: message }, { status: 422 });
  } finally {
    activeJobs--;
    // A cleanup failure here must never override an already-returned
    // response -- finally's own throw would replace a successful 201 with
    // an unhandled 500 even though the video was already saved.
    if (jobDir) {
      await rm(jobDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
