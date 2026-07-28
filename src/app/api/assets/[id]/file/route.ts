import { NextResponse } from "next/server";
import { z } from "zod";
import { Readable } from "stream";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { statAsset, readAssetStream } from "@/lib/storage/local-storage";

const AssetIdSchema = z.string().uuid();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getOrCreateLocalUserId();
  const { id } = await params;
  const parsedId = AssetIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid asset id." }, { status: 400 });
  }

  const [asset] = await query<{ storage_path: string; mime_type: string | null }>(
    `select storage_path, mime_type from assets where id = $1 and user_id = $2 and deleted_at is null`,
    [parsedId.data, userId]
  );
  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const stat = statAsset(asset.storage_path);
  const contentType = asset.mime_type || "application/octet-stream";
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
    const start = match ? Number(match[1]) : 0;
    const end = match && match[2] ? Number(match[2]) : stat.size - 1;
    const stream = readAssetStream(asset.storage_path, { start, end });
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = readAssetStream(asset.storage_path);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Content-Length": String(stat.size),
    },
  });
}
