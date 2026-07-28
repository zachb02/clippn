import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomBytes, randomUUID } from "crypto";
import Redis from "ioredis";
import {
  storeSessionCredential,
  getSessionCredential,
  deleteSessionCredential,
  getSessionCredentialTtl,
  closeSessionStoreConnection,
} from "./session-store";

beforeAll(() => {
  process.env.CREDENTIAL_MASTER_KEY = randomBytes(32).toString("base64");
});

afterAll(async () => {
  await closeSessionStoreConnection();
});

describe("session credential store (real local Redis)", () => {
  it("stores and retrieves a credential by connection id", async () => {
    const connectionId = randomUUID();
    await storeSessionCredential(connectionId, "sk-session-test-key", 60);
    const retrieved = await getSessionCredential(connectionId);
    expect(retrieved).toBe("sk-session-test-key");
    await deleteSessionCredential(connectionId);
  });

  it("never stores the plaintext key in Redis -- only ciphertext is on the wire", async () => {
    const connectionId = randomUUID();
    const plaintext = "sk-must-not-appear-in-redis";
    await storeSessionCredential(connectionId, plaintext, 60);

    const raw = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
    const rawValue = await raw.get(`clippn:session-credential:${connectionId}`);
    expect(rawValue).not.toBeNull();
    expect(rawValue).not.toContain(plaintext);
    await raw.quit();

    await deleteSessionCredential(connectionId);
  });

  it("returns null for a connection that was never stored", async () => {
    const retrieved = await getSessionCredential(randomUUID());
    expect(retrieved).toBeNull();
  });

  it("returns null after explicit deletion (disconnect)", async () => {
    const connectionId = randomUUID();
    await storeSessionCredential(connectionId, "sk-to-be-deleted", 60);
    expect(await getSessionCredential(connectionId)).toBe("sk-to-be-deleted");
    await deleteSessionCredential(connectionId);
    expect(await getSessionCredential(connectionId)).toBeNull();
  });

  it("sets a real TTL so the credential expires automatically", async () => {
    const connectionId = randomUUID();
    await storeSessionCredential(connectionId, "sk-ttl-test", 30);
    const ttl = await getSessionCredentialTtl(connectionId);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(30);
    await deleteSessionCredential(connectionId);
  });

  it("actually expires after the TTL elapses", async () => {
    const connectionId = randomUUID();
    await storeSessionCredential(connectionId, "sk-expires-fast", 1);
    expect(await getSessionCredential(connectionId)).toBe("sk-expires-fast");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(await getSessionCredential(connectionId)).toBeNull();
  });
});
