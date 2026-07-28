import { NextResponse } from "next/server";
import { z } from "zod";
import { readFile, writeFile, rm, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { VoiceoverRequestSchema } from "@/lib/schemas/voiceover";
import { getProvider } from "@/lib/ai/registry";
import { resolveCredential } from "@/lib/credentials/resolve-credential";
import { saveAsset } from "@/lib/storage/local-storage";
import { probeMedia } from "@/lib/media/ffmpeg";

const ProjectIdSchema = z.string().uuid();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getOrCreateLocalUserId();
  const { id } = await params;
  const parsedId = ProjectIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const [project] = await query<{ id: string }>(`select id from projects where id = $1 and user_id = $2`, [
    parsedId.data,
    userId,
  ]);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = VoiceoverRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { connectionId, script } = parsed.data;

  const credential = await resolveCredential(connectionId, userId);
  if (!credential) {
    return NextResponse.json({ error: "That provider connection isn't available. Reconnect it and try again." }, { status: 422 });
  }

  const provider = getProvider(credential.provider);
  if (!provider.synthesizeSpeech) {
    return NextResponse.json({ error: "This provider doesn't support speech synthesis." }, { status: 422 });
  }

  try {
    const speech = await provider.synthesizeSpeech({ text: script, modelId: "mock-full" }, credential);

    // Only a same-origin static asset path is supported today, since the
    // only implemented adapter (Mock) returns one -- a real provider
    // adapter (Phase 3) would return a remote URL, which needs an http
    // fetch here instead of a filesystem read. Not built until that
    // adapter exists for real.
    if (!speech.audioUrl.startsWith("/")) {
      return NextResponse.json({ error: "This provider's speech output isn't supported yet." }, { status: 501 });
    }
    const buffer = await readFile(path.join(process.cwd(), "public", speech.audioUrl));

    // ffprobe needs a real file on disk, not a Buffer -- write to a scratch
    // temp dir just for the probe, cleaned up immediately after.
    const probeDir = await mkdtemp(path.join(tmpdir(), "clippn-voiceover-"));
    let durationSeconds: number;
    try {
      const probePath = path.join(probeDir, "voiceover.mp3");
      await writeFile(probePath, buffer);
      durationSeconds = (await probeMedia(probePath)).durationSeconds;
    } finally {
      await rm(probeDir, { recursive: true, force: true });
    }

    const saved = await saveAsset(parsedId.data, buffer, "voiceover.mp3");
    const [asset] = await query<{
      id: string;
      kind: string;
      storage_path: string;
      original_filename: string | null;
      duration_seconds: string | null;
    }>(
      `insert into assets
         (user_id, project_id, kind, storage_path, original_filename, mime_type, byte_size,
          duration_seconds, source)
       values ($1, $2, 'voiceover', $3, 'voiceover.mp3', 'audio/mpeg', $4, $5, 'generated')
       returning id, kind, storage_path, original_filename, duration_seconds`,
      [userId, parsedId.data, saved.storagePath, buffer.length, durationSeconds]
    );

    return NextResponse.json({ asset, mock: speech.mock === true });
  } catch (error) {
    const normalized = provider.normalizeError(error);
    return NextResponse.json({ error: normalized.message, category: normalized.category }, { status: 422 });
  }
}
