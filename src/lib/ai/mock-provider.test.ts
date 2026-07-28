import { describe, expect, it, beforeEach } from "vitest";
import { mockProvider, resetMockProviderState } from "./mock-provider";
import type { DecryptedCredential } from "./types";

function credential(overrides: Partial<DecryptedCredential> = {}): DecryptedCredential {
  return {
    connectionId: crypto.randomUUID(),
    provider: "mock",
    apiKey: "mock-key-1234",
    ...overrides,
  };
}

describe("mock provider", () => {
  beforeEach(() => {
    resetMockProviderState();
  });

  it("succeeds by default and marks results as mock", async () => {
    const result = await mockProvider.generateText!(
      { prompt: "write a hook", modelId: "mock-full" },
      credential()
    );
    expect(result.mock).toBe(true);
    expect(result.text).toContain("Simulated response");
  });

  it("takes between 400ms and ~2.6s to simulate latency", async () => {
    const start = Date.now();
    await mockProvider.generateText!({ prompt: "hi", modelId: "mock-full" }, credential());
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(390);
    expect(elapsed).toBeLessThan(3000);
  });

  it("rejects with a generic error when the prompt contains the fail trigger", async () => {
    await expect(
      mockProvider.generateText!({ prompt: "please __mock_fail__ now", modelId: "mock-full" }, credential())
    ).rejects.toThrow();

    try {
      await mockProvider.generateText!({ prompt: "__mock_fail__", modelId: "mock-full" }, credential());
      expect.unreachable();
    } catch (error) {
      const normalized = mockProvider.normalizeError(error);
      expect(normalized.category).toBe("provider_unavailable");
    }
  });

  it("rate limits the 6th call within 60s from one connection", async () => {
    // 5 real calls at up to ~2.5s simulated latency each can approach 12s+.
    const cred = credential();
    for (let i = 0; i < 5; i++) {
      await expect(
        mockProvider.generateText!({ prompt: `call ${i}`, modelId: "mock-full" }, cred)
      ).resolves.toBeDefined();
    }
    try {
      await mockProvider.generateText!({ prompt: "call 6", modelId: "mock-full" }, cred);
      expect.unreachable("6th call should have been rate limited");
    } catch (error) {
      const normalized = mockProvider.normalizeError(error);
      expect(normalized.category).toBe("rate_limited");
      expect(normalized.retryable).toBe(true);
    }

    // A different connection is not affected by the first connection's rate limit.
    await expect(
      mockProvider.generateText!({ prompt: "fresh connection", modelId: "mock-full" }, credential())
    ).resolves.toBeDefined();
  }, 15_000);

  it("rejects with a moderation-style error when input contains the unsafe trigger", async () => {
    try {
      await mockProvider.generateText!(
        { prompt: "__mock_unsafe__ content", modelId: "mock-full" },
        credential()
      );
      expect.unreachable();
    } catch (error) {
      const normalized = mockProvider.normalizeError(error);
      expect(normalized.category).toBe("unsafe_content");
    }
  });

  it("rejects calling a capability the selected mock model doesn't declare", async () => {
    try {
      await mockProvider.generateImage!(
        { prompt: "a mountain", modelId: "mock-text-only" },
        credential()
      );
      expect.unreachable();
    } catch (error) {
      const normalized = mockProvider.normalizeError(error);
      expect(normalized.category).toBe("unsupported_capability");
    }
  });

  it("rejects before attempting any call when the connection's credential has expired", async () => {
    const expired = credential({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    try {
      await mockProvider.generateText!({ prompt: "hello", modelId: "mock-full" }, expired);
      expect.unreachable();
    } catch (error) {
      const normalized = mockProvider.normalizeError(error);
      expect(normalized.category).toBe("expired_credential");
    }
  });

  it("rejects discoverModels and getCapabilities for an expired credential too, not just generation calls", async () => {
    const expired = credential({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    await expect(mockProvider.discoverModels(expired)).rejects.toThrow();
    await expect(mockProvider.getCapabilities(expired)).rejects.toThrow();
  });

  it("mock-full only declares capabilities backed by a real implemented method", async () => {
    const models = await mockProvider.discoverModels(credential());
    const full = models.find((m) => m.modelId === "mock-full");
    // Every one of these must have a corresponding method above, or gating
    // UI code on capabilities (per the AIProvider contract) would call an
    // undefined method and crash instead of getting a clean rejection.
    expect(new Set(full?.capabilities)).toEqual(
      new Set([
        "textGeneration",
        "promptEnhancement", // via generateText, not its own method
        "imageGeneration",
        "imageEditing",
        "transcription",
        "wordLevelTimestamps", // transcribeAudio returns segment timestamps
        "textToSpeech",
      ])
    );
    expect(mockProvider.generateStructuredOutput).toBeUndefined();
    expect(mockProvider.createVideoJob).toBeUndefined();
  });

  it("validateCredential reports expired credentials without attempting a call", async () => {
    const expired = credential({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    const result = await mockProvider.validateCredential(expired);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired_credential");
  });

  it("validateCredential returns a masked ending for a valid credential", async () => {
    const result = await mockProvider.validateCredential(credential({ apiKey: "sk-mocktestkey9999" }));
    expect(result.valid).toBe(true);
    expect(result.maskedEnding).toBe("9999");
  });
});
