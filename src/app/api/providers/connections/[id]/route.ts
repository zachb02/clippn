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

  const [connection] = await query<{ storage_mode: string }>(
    `select storage_mode from provider_connections where id = $1 and user_id = $2`,
    [parsedId.data, userId]
  );
  if (!connection) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }

  if (connection.storage_mode === "session") {
    try {
      await deleteSessionCredential(parsedId.data);
    } catch {
      // Leave the connection row in place so disconnect can be retried,
      // rather than deleting Postgres metadata while the encrypted
      // credential is left stranded in Redis with no way to reach it.
      return NextResponse.json({ error: "Could not disconnect. Try again." }, { status: 500 });
    }
  }

  await query(`delete from provider_connections where id = $1 and user_id = $2`, [parsedId.data, userId]);
  return NextResponse.json({ deleted: true });
}
