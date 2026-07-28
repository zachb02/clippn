import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { saveAsset } from "@/lib/storage/local-storage";
import { probeMedia } from "@/lib/media/ffmpeg";
import { withTempJobDir } from "@/lib/media/temp-job";

const ProjectIdSchema = z.string().uuid();

interface AssetRow {
  id: string;
  kind: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  byte_size: string | null;
  duration_seconds: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getOrCreateLocalUserId();
  const { id } = await params;
  const parsedId = ProjectIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const assets = await query<AssetRow>(
    `select a.id, a.kind, a.storage_path, a.original_filename, a.mime_type, a.byte_size,
            a.duration_seconds, a.width, a.height, a.created_at
     from assets a
     join projects p on p.id = a.project_id
     where a.project_id = $1 and a.user_id = $2 and p.user_id = $2 and a.deleted_at is null
     order by a.created_at desc`,
    [parsedId.data, userId]
  );
  return NextResponse.json({ assets });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getOrCreateLocalUserId();
  const { id } = await params;
  const parsedId = ProjectIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const [project] = await query<{ id: string }>(
    `select id from projects where id = $1 and user_id = $2`,
    [parsedId.data, userId]
  );
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  try {
    // ffprobe parsing the upload is the real validation: garbage/corrupt
    // files fail here before anything is written to permanent storage.
    const metadata = await withTempJobDir(file, ".bin", async ({ sourcePath }) => probeMedia(sourcePath));

    const buffer = Buffer.from(await file.arrayBuffer());
    const { storagePath } = await saveAsset(parsedId.data, buffer, file.name);

    const kind = metadata.hasVideo ? "video" : "audio";
    const [asset] = await query<AssetRow>(
      `insert into assets
         (user_id, project_id, kind, storage_path, original_filename, mime_type, byte_size,
          duration_seconds, width, height, source)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'upload')
       returning id, kind, storage_path, original_filename, mime_type, byte_size,
                 duration_seconds, width, height, created_at`,
      [
        userId,
        parsedId.data,
        kind,
        storagePath,
        file.name.replace(/[/\\]/g, "_").slice(0, 255),
        file.type || null,
        file.size,
        metadata.durationSeconds,
        metadata.width || null,
        metadata.height || null,
      ]
    );

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process this file.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
