import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { CreateConnectionSchema } from "@/lib/schemas/provider-connection";
import { getProvider } from "@/lib/ai/registry";
import { wrapCredentialForStorage } from "@/lib/credentials/encryption";
import { storeSessionCredential } from "@/lib/credentials/session-store";

const SESSION_CREDENTIAL_TTL_SECONDS = 60 * 60 * 12; // 12h, matches SESSION_CREDENTIAL_TTL_HOURS default

interface ConnectionRow {
  id: string;
  provider: string;
  label: string;
  storage_mode: string;
  status: string;
  masked_ending: string | null;
  last_validated_at: string | null;
  created_at: string;
}

export async function GET() {
  const userId = await getOrCreateLocalUserId();
  // No provider_credentials columns are ever selected here -- metadata only.
  const connections = await query<ConnectionRow>(
    `select id, provider, label, storage_mode, status, masked_ending, last_validated_at, created_at
     from provider_connections
     where user_id = $1
     order by created_at desc`,
    [userId]
  );
  return NextResponse.json({ connections });
}

export async function POST(request: Request) {
  const userId = await getOrCreateLocalUserId();

  const body = await request.json().catch(() => null);
  const parsed = CreateConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { provider, label, apiKey, storageMode } = parsed.data;

  let providerAdapter;
  try {
    providerAdapter = getProvider(provider);
  } catch (error) {
    const message = error instanceof Error ? error.message : "This provider isn't supported.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let validation;
  try {
    validation = await providerAdapter.validateCredential({
      connectionId: "pending",
      provider,
      apiKey,
    });
  } catch (error) {
    // normalizeError is adapter-supplied; a defective future implementation
    // throwing here shouldn't crash this route.
    let message = "Could not validate this credential.";
    try {
      message = providerAdapter.normalizeError(error).message;
    } catch {
      // fall through to the generic message above
    }
    return NextResponse.json({ error: message }, { status: 422 });
  }
  if (!validation.valid) {
    // A network/timeout hiccup during validation isn't the same claim as
    // "this key is wrong" -- don't tell the user to replace a key that may
    // well be valid.
    if (validation.reason === "provider_unavailable") {
      return NextResponse.json(
        { error: "Couldn't reach the provider to validate this credential. Try again in a moment." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: validation.reason === "expired_credential" ? "This credential has expired." : "This credential is invalid." },
      { status: 422 }
    );
  }

  const [connection] = await query<ConnectionRow>(
    `insert into provider_connections (user_id, provider, label, storage_mode, status, masked_ending, last_validated_at)
     values ($1, $2, $3, $4, 'connected', $5, now())
     returning id, provider, label, storage_mode, status, masked_ending, created_at`,
    [userId, provider, label, storageMode, validation.maskedEnding]
  );

  if (!connection) {
    return NextResponse.json({ error: "Could not create the connection." }, { status: 500 });
  }

  // Whichever storage step runs, any failure in it must roll back the
  // connection row -- a "connected" row with no reachable credential behind
  // it is worse than no row at all.
  try {
    if (storageMode === "session") {
      // Never written to provider_credentials in this mode -- session-only,
      // encrypted, TTL-bound, deleted on disconnect.
      await storeSessionCredential(connection.id, apiKey, SESSION_CREDENTIAL_TTL_SECONDS);
    } else {
      const wrapped = wrapCredentialForStorage(apiKey);
      await query(
        `insert into provider_credentials
           (connection_id, encrypted_data_key, encrypted_credential, encryption_algorithm, key_version, nonce, auth_tag)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          connection.id,
          wrapped.encryptedDataKey,
          wrapped.encryptedCredential,
          wrapped.encryptionAlgorithm,
          wrapped.keyVersion,
          wrapped.nonce,
          wrapped.authTag,
        ]
      );
    }
  } catch {
    try {
      await query(`delete from provider_connections where id = $1`, [connection.id]);
    } catch {
      // Rollback itself failed -- the connection row may remain without a
      // reachable credential. Still return a clean error rather than an
      // unhandled rejection; a stray row is recoverable by hand, a crashed
      // response is not.
    }
    return NextResponse.json({ error: "Could not store the credential securely." }, { status: 500 });
  }

  return NextResponse.json({ connection }, { status: 201 });
}
