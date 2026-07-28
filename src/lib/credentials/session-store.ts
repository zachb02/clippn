import Redis from "ioredis";
import { wrapCredentialForStorage, unwrapStoredCredential, type WrappedCredential } from "./encryption";

let client: Redis | null = null;

function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  }
  return client;
}

function sessionKey(connectionId: string): string {
  return `clippn:session-credential:${connectionId}`;
}

interface SerializedWrapped {
  encryptedCredential: string;
  nonce: string;
  authTag: string;
  encryptedDataKey: string;
  encryptionAlgorithm: string;
  keyVersion: number;
}

function serialize(wrapped: WrappedCredential): string {
  const payload: SerializedWrapped = {
    encryptedCredential: wrapped.encryptedCredential.toString("base64"),
    nonce: wrapped.nonce.toString("base64"),
    authTag: wrapped.authTag.toString("base64"),
    encryptedDataKey: wrapped.encryptedDataKey.toString("base64"),
    encryptionAlgorithm: wrapped.encryptionAlgorithm,
    keyVersion: wrapped.keyVersion,
  };
  return JSON.stringify(payload);
}

function deserialize(raw: string): WrappedCredential {
  const payload = JSON.parse(raw) as SerializedWrapped;
  return {
    encryptedCredential: Buffer.from(payload.encryptedCredential, "base64"),
    nonce: Buffer.from(payload.nonce, "base64"),
    authTag: Buffer.from(payload.authTag, "base64"),
    encryptedDataKey: Buffer.from(payload.encryptedDataKey, "base64"),
    encryptionAlgorithm: payload.encryptionAlgorithm,
    keyVersion: payload.keyVersion,
  };
}

/**
 * Session-only credential storage (the default mode). The key is encrypted
 * immediately and held in Redis with a TTL, keyed only by connectionId --
 * never written to Postgres in this mode. Deleted explicitly on logout/disconnect,
 * and expires automatically even if that never happens.
 */
export async function storeSessionCredential(
  connectionId: string,
  plaintextApiKey: string,
  ttlSeconds: number
): Promise<void> {
  const wrapped = wrapCredentialForStorage(plaintextApiKey);
  await getRedis().set(sessionKey(connectionId), serialize(wrapped), "EX", ttlSeconds);
}

/** Returns null if there is no active session credential (never expired, never disconnected -> null). */
export async function getSessionCredential(connectionId: string): Promise<string | null> {
  const raw = await getRedis().get(sessionKey(connectionId));
  if (!raw) return null;
  return unwrapStoredCredential(deserialize(raw));
}

export async function deleteSessionCredential(connectionId: string): Promise<void> {
  await getRedis().del(sessionKey(connectionId));
}

/** Test/ops only: never exposed to any route. */
export async function getSessionCredentialTtl(connectionId: string): Promise<number> {
  return getRedis().ttl(sessionKey(connectionId));
}

export async function closeSessionStoreConnection(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
