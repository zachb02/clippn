import { NextResponse } from "next/server";
import { mkdtemp, rm, writeFile, readFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { RedditStoryRequestSchema } from "@/lib/schemas/reddit-story";
import { getProvider } from "@/lib/ai/registry";
import { getDefaultTextModelId, getDefaultSpeechModelId, getDefaultTranscriptionModelId } from "@/lib/ai/default-models";
import { resolveCredential } from "@/lib/credentials/resolve-credential";
import { resolveGeneratedMediaBuffer } from "@/lib/ai/resolve-generated-media";
import { saveAsset, deleteAsset } from "@/lib/storage/local-storage";
import { inspectMedia, probeMedia } from "@/lib/media/ffmpeg";
import { renderStoryCard } from "@/lib/timeline/reddit-card-render";
import { renderIdeaToShort } from "@/lib/timeline/idea-to-short-render";

// Same reasoning as Auto Clip / Idea-to-Short: a local single-user app
// with no distributed rate limiter, but nothing should let several
// concurrent multi-step generation pipelines pile up unbounded.
const MAX_CONCURRENT_JOBS = 2;
let activeJobs = 0;

class RedditStoryError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function POST(request: Request) {
  const userId = await getOrCreateLocalUserId();

  const body = await request.json().catch(() => null);
  const parsed = RedditStoryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { connectionId, topic } = parsed.data;

  const credential = await resolveCredential(connectionId, userId);
  if (!credential) {
    return NextResponse.json({ error: "That provider connection isn't available. Reconnect it and try again." }, { status: 422 });
  }
  const provider = getProvider(credential.provider);
  if (!provider.generateText || !provider.synthesizeSpeech || !provider.transcribeAudio) {
    return NextResponse.json(
      { error: "This provider doesn't support the full Reddit Story pipeline (text, speech, and transcription)." },
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
    jobDir = await mkdtemp(path.join(tmpdir(), "clippn-reddit-story-"));

    const [project] = await query<{ id: string }>(
      `insert into projects (user_id, title, workflow, status)
       values ($1, $2, 'story', 'generating')
       returning id`,
      [userId, topic.slice(0, 120)]
    );
    if (!project) {
      throw new RedditStoryError(500, "Could not create a project for this story.");
    }
    projectId = project.id;

    const titlePrompt = `Write ONLY a short, punchy Reddit-style story post title (under 100 characters) about: ${topic}. Return ONLY the title text, nothing else -- no quotes, no "Title:" prefix.`;
    const titleResult = await provider.generateText(
      { prompt: titlePrompt, modelId: getDefaultTextModelId(credential.provider) },
      credential
    );
    const title = titleResult.text.trim().replace(/^["']|["']$/g, "").slice(0, 200);
    if (!title) {
      throw new RedditStoryError(502, "Could not generate a story title.");
    }

    const bodyPrompt = `Write a Reddit-style first-person story post (150-200 words) about: ${topic}. Return ONLY the narrative text -- no title, no headers, no formatting.`;
    const bodyResult = await provider.generateText(
      { prompt: bodyPrompt, modelId: getDefaultTextModelId(credential.provider) },
      credential
    );
    const script = bodyResult.text.trim();
    if (!script) {
      throw new RedditStoryError(502, "Could not generate a story body.");
    }

    const speech = await provider.synthesizeSpeech(
      { text: script, modelId: getDefaultSpeechModelId(credential.provider) },
      credential
    );
    const audioBuffer = await resolveGeneratedMediaBuffer(speech.audioUrl, "audio");
    const audioPath = path.join(jobDir, "narration.mp3");
    await writeFile(audioPath, audioBuffer);
    const audioMetadata = await probeMedia(audioPath);
    if (!audioMetadata.hasAudio) {
      throw new RedditStoryError(502, "The generated narration had no audio.");
    }

    // Captions come from transcribing the actual generated narration --
    // never LLM-invented -- for any real provider. Mock mode is the one
    // exception (see idea-to-short/route.ts for why).
    const transcript = await provider.transcribeAudio(
      { audioUrl: audioPath, modelId: getDefaultTranscriptionModelId(credential.provider), durationSeconds: audioMetadata.durationSeconds },
      credential
    );

    // Deterministic, not AI-generated -- this workflow doesn't need
    // image-generation capability at all.
    const canvasWidth = 1080;
    const canvasHeight = 1920;
    const cardBuffer = await renderStoryCard(title, canvasWidth, canvasHeight);
    const cardPath = path.join(jobDir, "card.png");
    await writeFile(cardPath, cardBuffer);

    const outputPath = path.join(jobDir, "output.mp4");
    await renderIdeaToShort({
      backgroundImagePath: cardPath,
      audioPath,
      outputPath,
      workDir: jobDir,
      durationSeconds: audioMetadata.durationSeconds,
      captions: transcript.segments.map((s) => ({ startSeconds: s.start, endSeconds: s.end, text: s.text })),
      canvasWidth,
      canvasHeight,
    });

    const renderedMetadata = await inspectMedia(outputPath);
    const renderedBuffer = await readFile(outputPath);
    const saved = await saveAsset(projectId, renderedBuffer, `${title.slice(0, 40)}.mp4`);
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
        `${title.slice(0, 40)}.mp4`,
        renderedBuffer.byteLength,
        renderedMetadata.durationSeconds,
        renderedMetadata.width || null,
        renderedMetadata.height || null,
      ]
    );
    if (!asset) {
      throw new RedditStoryError(500, "Could not save the generated video.");
    }

    await query(`update projects set status = 'completed' where id = $1`, [projectId]);

    return NextResponse.json(
      {
        projectId,
        assetId: asset.id,
        title,
        script,
        durationSeconds: renderedMetadata.durationSeconds,
        mock: speech.mock === true || titleResult.mock === true || bodyResult.mock === true,
      },
      { status: 201 }
    );
  } catch (error) {
    if (projectId) {
      await query(`delete from assets where project_id = $1`, [projectId]).catch(() => {});
      await query(`delete from projects where id = $1`, [projectId]).catch(() => {});
    }
    for (const storagePath of savedStoragePaths) {
      await deleteAsset(storagePath);
    }
    if (error instanceof RedditStoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    let message = error instanceof Error ? error.message : "Could not generate this story video.";
    try {
      message = provider.normalizeError(error).message;
    } catch {
      // fall through to the message derived above
    }
    return NextResponse.json({ error: message }, { status: 422 });
  } finally {
    activeJobs--;
    if (jobDir) {
      await rm(jobDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
