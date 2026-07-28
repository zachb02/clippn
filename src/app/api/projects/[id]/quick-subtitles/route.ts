import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { QuickSubtitlesRequestSchema } from "@/lib/schemas/quick-subtitles";
import { getProvider } from "@/lib/ai/registry";
import { getDefaultTranscriptionModelId } from "@/lib/ai/default-models";
import { resolveCredential } from "@/lib/credentials/resolve-credential";
import { resolveStoragePath } from "@/lib/storage/local-storage";

const ProjectIdSchema = z.string().uuid();

export interface CaptionSegment {
  startSeconds: number;
  durationSeconds: number;
  text: string;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getOrCreateLocalUserId();
  const { id } = await params;
  const parsedId = ProjectIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = QuickSubtitlesRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { connectionId, assetId } = parsed.data;

  const [asset] = await query<{ id: string; storage_path: string; duration_seconds: string | null }>(
    `select id, storage_path, duration_seconds from assets
     where id = $1 and project_id = $2 and user_id = $3 and deleted_at is null`,
    [assetId, parsedId.data, userId]
  );
  if (!asset) {
    return NextResponse.json({ error: "Asset not found in this project." }, { status: 404 });
  }

  const credential = await resolveCredential(connectionId, userId);
  if (!credential) {
    return NextResponse.json({ error: "That provider connection isn't available. Reconnect it and try again." }, { status: 422 });
  }

  const provider = getProvider(credential.provider);
  if (!provider.transcribeAudio) {
    return NextResponse.json({ error: "This provider doesn't support transcription." }, { status: 422 });
  }

  let audioPath: string;
  try {
    audioPath = resolveStoragePath(asset.storage_path);
  } catch {
    return NextResponse.json({ error: "This asset's stored file could not be located." }, { status: 500 });
  }

  try {
    const transcript = await provider.transcribeAudio(
      {
        audioUrl: audioPath,
        modelId: getDefaultTranscriptionModelId(credential.provider),
        durationSeconds: asset.duration_seconds ? Number(asset.duration_seconds) : undefined,
      },
      credential
    );

    const captions: CaptionSegment[] = transcript.segments.map((segment) => ({
      startSeconds: segment.start,
      durationSeconds: Math.max(0.5, segment.end - segment.start),
      text: segment.text,
    }));

    return NextResponse.json({ captions, mock: transcript.mock === true });
  } catch (error) {
    const normalized = provider.normalizeError(error);
    return NextResponse.json({ error: normalized.message, category: normalized.category }, { status: 422 });
  }
}
