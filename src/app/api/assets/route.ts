import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";

export interface UserAssetRow {
  id: string;
  project_id: string;
  project_title: string;
  kind: string;
  original_filename: string | null;
  mime_type: string | null;
  byte_size: string | null;
  duration_seconds: string | null;
  width: number | null;
  height: number | null;
  source: string;
  created_at: string;
}

export async function GET() {
  const userId = await getOrCreateLocalUserId();
  const assets = await query<UserAssetRow>(
    `select a.id, a.project_id, p.title as project_title, a.kind, a.original_filename,
            a.mime_type, a.byte_size, a.duration_seconds, a.width, a.height, a.source, a.created_at
     from assets a
     join projects p on p.id = a.project_id
     where a.user_id = $1 and p.user_id = $1 and a.deleted_at is null
     order by a.created_at desc`,
    [userId]
  );
  return NextResponse.json({ assets });
}
