import { describe, expect, it, beforeAll } from "vitest";
import { randomBytes } from "crypto";
import { wrapCredentialForStorage, unwrapStoredCredential } from "./encryption";

beforeAll(() => {
  process.env.CREDENTIAL_MASTER_KEY = randomBytes(32).toString("base64");
});

describe("envelope encryption", () => {
  it("round-trips a plaintext credential through wrap and unwrap", () => {
    const plaintext = "sk-test-abc123XYZ";
    const wrapped = wrapCredentialForStorage(plaintext);
    expect(unwrapStoredCredential(wrapped)).toBe(plaintext);
  });

  it("never stores the plaintext credential inside the wrapped payload", () => {
    const plaintext = "sk-super-secret-value";
    const wrapped = wrapCredentialForStorage(plaintext);
    const serialized = Buffer.concat([
      wrapped.encryptedCredential,
      wrapped.encryptedDataKey,
      wrapped.nonce,
      wrapped.authTag,
    ]).toString("latin1");
    expect(serialized).not.toContain(plaintext);
  });

  it("generates a unique data-encryption key for every call, even for the same plaintext", () => {
    const plaintext = "sk-identical-key-value";
    const a = wrapCredentialForStorage(plaintext);
    const b = wrapCredentialForStorage(plaintext);
    expect(a.encryptedDataKey.equals(b.encryptedDataKey)).toBe(false);
    expect(a.encryptedCredential.equals(b.encryptedCredential)).toBe(false);
    expect(a.nonce.equals(b.nonce)).toBe(false);
  });

  it("fails to decrypt when the ciphertext is tampered with", () => {
    const wrapped = wrapCredentialForStorage("sk-tamper-test");
    const tampered = { ...wrapped, encryptedCredential: Buffer.from(wrapped.encryptedCredential) };
    tampered.encryptedCredential[0] ^= 0xff;
    expect(() => unwrapStoredCredential(tampered)).toThrow();
  });

  it("fails to decrypt when the auth tag is tampered with", () => {
    const wrapped = wrapCredentialForStorage("sk-tamper-test-2");
    const tampered = { ...wrapped, authTag: Buffer.from(wrapped.authTag) };
    tampered.authTag[0] ^= 0xff;
    expect(() => unwrapStoredCredential(tampered)).toThrow();
  });

  it("fails to decrypt when the wrapped data key is tampered with", () => {
    const wrapped = wrapCredentialForStorage("sk-tamper-test-3");
    const tampered = { ...wrapped, encryptedDataKey: Buffer.from(wrapped.encryptedDataKey) };
    tampered.encryptedDataKey[5] ^= 0xff;
    expect(() => unwrapStoredCredential(tampered)).toThrow();
  });

  it("refuses to operate without a configured master key", () => {
    const original = process.env.CREDENTIAL_MASTER_KEY;
    delete process.env.CREDENTIAL_MASTER_KEY;
    try {
      expect(() => wrapCredentialForStorage("sk-no-master-key")).toThrow();
    } finally {
      process.env.CREDENTIAL_MASTER_KEY = original;
    }
  });
});
