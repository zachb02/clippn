import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { deleteSessionCredential } from "@/lib/credentials/session-store";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getOrCreateLocalUserId();
  const { id } = await params;

  await query(`delete from provider_connections where id = $1 and user_id = $2`, [id, userId]);
  await deleteSessionCredential(id);
  return NextResponse.json({ deleted: true });
}
