import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { deleteSessionCredential } from "@/lib/credentials/session-store";

const ConnectionIdSchema = z.string().uuid();

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getOrCreateLocalUserId();
  const { id } = await params;

  const parsedId = ConnectionIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid connection id." }, { status: 400 });
  }

  // Delete and check ownership in the same statement -- no separate SELECT,
  // so there's no window for the row to change between checking it exists
  // and removing it.
  const [deletedConnection] = await query<{ storage_mode: string }>(
    `delete from provider_connections where id = $1 and user_id = $2 returning storage_mode`,
    [parsedId.data, userId]
  );
  if (!deletedConnection) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }

  if (deletedConnection.storage_mode === "session") {
    // The Postgres row is already gone at this point regardless of whether
    // this succeeds; a failure here just means the encrypted credential
    // waits out its TTL in Redis instead of being removed immediately.
    await deleteSessionCredential(parsedId.data).catch(() => {});
  }

  return NextResponse.json({ deleted: true });
}
