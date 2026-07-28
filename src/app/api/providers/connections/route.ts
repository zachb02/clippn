import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { CreateConnectionSchema } from "@/lib/schemas/provider-connection";
import { mockProvider } from "@/lib/ai/mock-provider";
import { wrapCredentialForStorage } from "@/lib/credentials/encryption";
import { storeSessionCredential } from "@/lib/credentials/session-store";

const SESSION_CREDENTIAL_TTL_SECONDS = 60 * 60 * 12; // 12h, matches SESSION_CREDENTIAL_TTL_HOURS default

// Phase 1 only implements a real adapter for the mock provider (see
// docs/architecture/12-implementation-plan.md). google-gemini/openai
// connections are refused here rather than silently skipping validation.
const IMPLEMENTED_PROVIDERS = new Set(["mock"]);

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

  if (!IMPLEMENTED_PROVIDERS.has(provider)) {
    return NextResponse.json(
      { error: `The ${provider} adapter isn't implemented yet. Use the Mock Provider for now.` },
      { status: 400 }
    );
  }

  const validation = await mockProvider.validateCredential({
    connectionId: "pending",
    provider,
    apiKey,
  });
  if (!validation.valid) {
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
