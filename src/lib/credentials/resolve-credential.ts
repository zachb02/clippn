import { query } from "@/lib/db";
import { getSessionCredential } from "./session-store";
import { unwrapStoredCredential, type WrappedCredential } from "./encryption";
import type { DecryptedCredential, ProviderId } from "@/lib/ai/types";

/**
 * Resolves a stored connection to a plaintext, in-memory-only credential,
 * immediately before a provider call -- this is the one place in the
 * codebase that produces a decrypted key from storage. The result is never
 * returned from an API route to the browser; callers use it only to pass
 * to a provider adapter method in the same request.
 */
export async function resolveCredential(
  connectionId: string,
  userId: string
): Promise<DecryptedCredential | null> {
  const [connection] = await query<{
    provider: ProviderId;
    storage_mode: string;
    expires_at: string | null;
  }>(
    `select provider, storage_mode, expires_at from provider_connections where id = $1 and user_id = $2`,
    [connectionId, userId]
  );
  if (!connection) return null;

  let apiKey: string | null = null;
  if (connection.storage_mode === "session") {
    apiKey = await getSessionCredential(connectionId);
  } else {
    const [wrapped] = await query<{
      encrypted_data_key: Buffer;
      encrypted_credential: Buffer;
      encryption_algorithm: string;
      key_version: number;
      nonce: Buffer;
      auth_tag: Buffer;
    }>(
      `select encrypted_data_key, encrypted_credential, encryption_algorithm, key_version, nonce, auth_tag
       from provider_credentials where connection_id = $1`,
      [connectionId]
    );
    if (wrapped) {
      const payload: WrappedCredential = {
        encryptedDataKey: wrapped.encrypted_data_key,
        encryptedCredential: wrapped.encrypted_credential,
        encryptionAlgorithm: wrapped.encryption_algorithm,
        keyVersion: wrapped.key_version,
        nonce: wrapped.nonce,
        authTag: wrapped.auth_tag,
      };
      apiKey = unwrapStoredCredential(payload);
    }
  }

  if (!apiKey) return null;
  return {
    connectionId,
    provider: connection.provider,
    apiKey,
    expiresAt: connection.expires_at ?? undefined,
  };
}
