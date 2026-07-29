import type {
  AIProvider,
  Capability,
  CredentialValidationResult,
  DecryptedCredential,
  ImageEditInput,
  ImageGenerationInput,
  ImageGenerationResult,
  ModelDescriptor,
  NormalizedProviderError,
  ProviderCapabilities,
  ProviderErrorCategory,
  SpeechResult,
  SpeechSynthesisInput,
  TextGenerationInput,
  TextGenerationResult,
  TranscriptResult,
  TranscriptionInput,
} from "./types";

const FAIL_TRIGGER = "__mock_fail__";
const UNSAFE_TRIGGER = "__mock_unsafe__";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_CALLS = 5;

// Only capabilities with a real implemented method below. The AIProvider
// contract says consumers gate on declared capabilities, not on whether a
// method happens to exist -- so declaring more than is implemented would be
// a live footgun, not just a documentation mismatch.
const FULL_CAPABILITIES: Capability[] = [
  "textGeneration",
  "promptEnhancement",
  "imageGeneration",
  "imageEditing",
  // Not wordLevelTimestamps: TranscriptResult only carries segment-level
  // timing (see transcribeAudio below and types.ts), so declaring
  // word-level granularity here would be a capability the mock can't
  // actually satisfy.
  "transcription",
  "textToSpeech",
];

const MOCK_MODELS: Record<string, Capability[]> = {
  "mock-full": FULL_CAPABILITIES,
  "mock-text-only": ["textGeneration", "promptEnhancement"],
};

export class MockProviderError extends Error {
  category: ProviderErrorCategory;
  constructor(category: ProviderErrorCategory, message: string) {
    super(message);
    this.category = category;
    this.name = "MockProviderError";
  }
}

/** Recent call timestamps per connection, for the rolling rate-limit window. */
const callHistory = new Map<string, number[]>();

function recordCallAndCheckRateLimit(connectionId: string): void {
  const now = Date.now();
  const history = (callHistory.get(connectionId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (history.length >= RATE_LIMIT_MAX_CALLS) {
    callHistory.set(connectionId, history);
    throw new MockProviderError("rate_limited", "Mock provider rate limit exceeded (5 calls/60s).");
  }
  history.push(now);
  callHistory.set(connectionId, history);
}

/** Test-only: clears rate-limit state between test cases. */
export function resetMockProviderState(): void {
  callHistory.clear();
}

function checkExpiry(credential: DecryptedCredential): void {
  if (credential.expiresAt && new Date(credential.expiresAt).getTime() < Date.now()) {
    throw new MockProviderError("expired_credential", "This connection's credential has expired.");
  }
}

function checkTriggers(text: string): void {
  if (text.includes(FAIL_TRIGGER)) {
    throw new MockProviderError("provider_unavailable", "Simulated provider failure.");
  }
  if (text.includes(UNSAFE_TRIGGER)) {
    throw new MockProviderError("unsafe_content", "Simulated moderation rejection.");
  }
}

function checkCapability(modelId: string, capability: Capability): void {
  const capabilities = MOCK_MODELS[modelId];
  if (!capabilities) {
    throw new MockProviderError("invalid_credential", `Unknown mock model "${modelId}".`);
  }
  if (!capabilities.includes(capability)) {
    throw new MockProviderError(
      "unsupported_capability",
      `Model "${modelId}" does not declare "${capability}".`
    );
  }
}

const MOCK_SENTENCES = [
  "This is a simulated caption from the Mock Provider.",
  "No real transcription happened here.",
  "Connect a real provider to transcribe actual speech.",
  "Every segment below is placeholder text, clearly labeled as mock.",
];

/** Splits a known duration into a few short segments so the caller (e.g.
 * Quick Subtitles) gets something realistic to distribute across a
 * timeline, instead of one blob covering the whole clip. */
function mockSegments(durationSeconds?: number): { start: number; end: number; text: string }[] {
  if (!durationSeconds || durationSeconds <= 0) {
    return [{ start: 0, end: 2.4, text: MOCK_SENTENCES[0] }];
  }
  const segmentLength = 2.5;
  const count = Math.max(1, Math.min(MOCK_SENTENCES.length, Math.ceil(durationSeconds / segmentLength)));
  const segments: { start: number; end: number; text: string }[] = [];
  for (let i = 0; i < count; i++) {
    const start = i * segmentLength;
    const end = Math.min(start + segmentLength, durationSeconds);
    if (start >= durationSeconds) break;
    segments.push({ start, end, text: MOCK_SENTENCES[i % MOCK_SENTENCES.length] });
  }
  return segments;
}

/**
 * Auto Clip asks for a strict JSON array of {startSeconds,endSeconds,title}
 * clip candidates. A generic "Simulated response for: ..." string isn't
 * valid JSON, which would make Auto Clip untestable in Mock Provider mode
 * -- defeating the whole point of Mock mode ("every capability's success...
 * demoed and tested with zero external dependency"). Instead, recognize
 * this prompt shape and fabricate a plausible answer using the REAL
 * timestamp brackets already embedded in the prompt (Auto Clip writes each
 * transcript line as "[start-end] text"), so the mock's output is at least
 * grounded in real numbers from the actual request, not just placeholder
 * text pretending to be data.
 */
function mockGenerateTextBody(prompt: string): string {
  // A short substring like "JSON array"+"startSeconds" can appear inside an
  // unrelated feature's prompt if a user's own input happens to contain
  // those words (e.g. Content Brainstorm interpolates the user's topic
  // verbatim) -- match the longer, near-unique instruction phrase from this
  // route's own template instead, which is far less likely to occur by
  // accident in arbitrary user text.
  if (prompt.includes("of up to 5 clip candidates") && prompt.includes("startSeconds")) {
    const bracketPattern = /\[(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\]/g;
    const ranges: { start: number; end: number }[] = [];
    let match: RegExpExecArray | null;
    while ((match = bracketPattern.exec(prompt)) !== null) {
      ranges.push({ start: Number(match[1]), end: Number(match[2]) });
    }
    const candidateCount = Math.min(3, Math.max(1, ranges.length));
    const highlights = Array.from({ length: candidateCount }, (_, i) => {
      const range = ranges[i] ?? { start: i * 10, end: i * 10 + 8 };
      return {
        startSeconds: range.start,
        endSeconds: Math.max(range.end, range.start + 5),
        title: `Simulated highlight ${i + 1} (Mock Provider)`,
      };
    });
    return JSON.stringify(highlights);
  }
  return `Simulated response (Mock Provider) for: "${prompt.slice(0, 80)}"`;
}

async function simulateLatency(): Promise<void> {
  const delay = 400 + Math.random() * 2100;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

async function runMockCall<T>(
  credential: DecryptedCredential,
  modelId: string,
  capability: Capability,
  triggerText: string,
  build: () => T
): Promise<T> {
  // Pre-flight checks a real client/SDK would also reject locally, without a
  // network round trip: expired token, unsupported feature, exhausted rate
  // limit. These stay fast on purpose. Content-based rejections (fail/unsafe
  // triggers) genuinely require the "provider" to look at the request, so
  // they run after the simulated latency, same as a real success response.
  checkExpiry(credential);
  checkCapability(modelId, capability);
  recordCallAndCheckRateLimit(credential.connectionId);
  await simulateLatency();
  checkTriggers(triggerText);
  return build();
}

export const mockProvider: AIProvider = {
  id: "mock",

  async validateCredential(credential: DecryptedCredential): Promise<CredentialValidationResult> {
    if (credential.expiresAt && new Date(credential.expiresAt).getTime() < Date.now()) {
      return { valid: false, reason: "expired_credential" };
    }
    if (!credential.apiKey || credential.apiKey.length === 0) {
      return { valid: false, reason: "invalid_credential" };
    }
    return { valid: true, maskedEnding: credential.apiKey.slice(-4) };
  },

  async discoverModels(credential: DecryptedCredential): Promise<ModelDescriptor[]> {
    checkExpiry(credential);
    return Object.entries(MOCK_MODELS).map(([modelId, capabilities]) => ({
      modelId,
      displayName: modelId === "mock-full" ? "Mock (full capabilities)" : "Mock (text only)",
      capabilities,
    }));
  },

  async getCapabilities(credential: DecryptedCredential, modelId = "mock-full"): Promise<ProviderCapabilities> {
    checkExpiry(credential);
    const capabilities = MOCK_MODELS[modelId];
    if (!capabilities) {
      throw new MockProviderError("invalid_credential", `Unknown mock model "${modelId}".`);
    }
    return {
      provider: "mock",
      modelId,
      capabilities,
      discoveredAt: new Date().toISOString(),
    };
  },

  async generateText(
    input: TextGenerationInput,
    credential: DecryptedCredential
  ): Promise<TextGenerationResult> {
    return runMockCall(credential, input.modelId, "textGeneration", input.prompt, () => ({
      text: mockGenerateTextBody(input.prompt),
      modelId: input.modelId,
      mock: true as const,
    }));
  },

  async generateImage(
    input: ImageGenerationInput,
    credential: DecryptedCredential
  ): Promise<ImageGenerationResult> {
    return runMockCall(credential, input.modelId, "imageGeneration", input.prompt, () => ({
      imageUrl: "/mock-assets/placeholder-image.png",
      modelId: input.modelId,
      mock: true as const,
    }));
  },

  async editImage(
    input: ImageEditInput,
    credential: DecryptedCredential
  ): Promise<ImageGenerationResult> {
    return runMockCall(credential, input.modelId, "imageEditing", input.prompt, () => ({
      imageUrl: "/mock-assets/placeholder-image-edited.png",
      modelId: input.modelId,
      mock: true as const,
    }));
  },

  async transcribeAudio(
    input: TranscriptionInput,
    credential: DecryptedCredential
  ): Promise<TranscriptResult> {
    return runMockCall(credential, input.modelId, "transcription", input.audioUrl, () => ({
      text: "This is a simulated transcript from the Mock Provider.",
      segments: mockSegments(input.durationSeconds),
      modelId: input.modelId,
      mock: true as const,
    }));
  },

  async synthesizeSpeech(
    input: SpeechSynthesisInput,
    credential: DecryptedCredential
  ): Promise<SpeechResult> {
    return runMockCall(credential, input.modelId, "textToSpeech", input.text, () => ({
      audioUrl: "/mock-assets/placeholder-voiceover.mp3",
      modelId: input.modelId,
      mock: true as const,
    }));
  },

  normalizeError(error: unknown): NormalizedProviderError {
    if (error instanceof MockProviderError) {
      const retryable = error.category === "rate_limited" || error.category === "provider_unavailable";
      return { category: error.category, message: error.message, retryable };
    }
    if (error instanceof Error) {
      return { category: "unknown", message: error.message, retryable: false };
    }
    return { category: "unknown", message: "Unknown mock provider error.", retryable: false };
  },
};
