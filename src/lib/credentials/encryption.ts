import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;

export interface EncryptedPayload {
  ciphertext: Buffer;
  nonce: Buffer;
  authTag: Buffer;
}

/** One AES-256-GCM encrypt/decrypt pair. Used both for a per-credential DEK
 * and for wrapping that DEK with the master key -- same primitive, two layers. */
function encryptWithKey(plaintext: Buffer, key: Buffer): EncryptedPayload {
  const nonce = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, nonce, authTag };
}

function decryptWithKey(payload: EncryptedPayload, key: Buffer): Buffer {
  const decipher = createDecipheriv(ALGORITHM, key, payload.nonce);
  decipher.setAuthTag(payload.authTag);
  return Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
}

/**
 * Reads the local-development master key from the environment. In production
 * this must be backed by a real KMS (see docs/architecture/06-credential-threat-model.md);
 * this function throws in production if no KMS-backed key is configured, rather
 * than silently falling back to a file-based key.
 */
function getMasterKey(): Buffer {
  const raw = process.env.CREDENTIAL_MASTER_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CREDENTIAL_MASTER_KEY is not configured. Refusing to start in production without a KMS-backed master key."
      );
    }
    throw new Error(
      "CREDENTIAL_MASTER_KEY is not set. Set a 32-byte base64 key in .env.local for local development (never commit it)."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(`CREDENTIAL_MASTER_KEY must decode to exactly ${KEY_LENGTH_BYTES} bytes.`);
  }
  return key;
}

export interface WrappedCredential {
  encryptedCredential: Buffer;
  nonce: Buffer;
  authTag: Buffer;
  encryptedDataKey: Buffer;
  encryptionAlgorithm: string;
  keyVersion: number;
}

/**
 * "Remember securely" mode. A unique data-encryption key (DEK) is generated
 * per credential and used to encrypt the plaintext key; the DEK itself is
 * then wrapped by the master key. Only ciphertext + wrapped DEK are ever
 * returned -- the plaintext key and the raw DEK never leave this function.
 */
export function wrapCredentialForStorage(plaintextApiKey: string): WrappedCredential {
  const dataKey = randomBytes(KEY_LENGTH_BYTES);
  const { ciphertext, nonce, authTag } = encryptWithKey(Buffer.from(plaintextApiKey, "utf8"), dataKey);

  const masterKey = getMasterKey();
  // Wrap the DEK itself with the master key. The wrapped-DEK's own nonce/tag
  // are packed alongside it (data key encryption is a one-off, not reused).
  const wrappedDek = encryptWithKey(dataKey, masterKey);
  const encryptedDataKey = Buffer.concat([wrappedDek.nonce, wrappedDek.authTag, wrappedDek.ciphertext]);

  return {
    encryptedCredential: ciphertext,
    nonce,
    authTag,
    encryptedDataKey,
    encryptionAlgorithm: ALGORITHM,
    keyVersion: 1,
  };
}

/**
 * Reverses wrapCredentialForStorage. This is the ONLY function in the codebase
 * that may produce a plaintext credential from stored ciphertext, and it must
 * only ever be called from the worker/server code path immediately before a
 * provider request -- never from a route that returns a response to the browser.
 */
export function unwrapStoredCredential(wrapped: WrappedCredential): string {
  const masterKey = getMasterKey();
  const dekNonce = wrapped.encryptedDataKey.subarray(0, IV_LENGTH_BYTES);
  const dekAuthTag = wrapped.encryptedDataKey.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + 16);
  const dekCiphertext = wrapped.encryptedDataKey.subarray(IV_LENGTH_BYTES + 16);
  const dataKey = decryptWithKey({ ciphertext: dekCiphertext, nonce: dekNonce, authTag: dekAuthTag }, masterKey);

  const plaintext = decryptWithKey(
    { ciphertext: wrapped.encryptedCredential, nonce: wrapped.nonce, authTag: wrapped.authTag },
    dataKey
  );
  return plaintext.toString("utf8");
}
