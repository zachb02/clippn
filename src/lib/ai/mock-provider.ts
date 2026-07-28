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

const ALL_CAPABILITIES: Capability[] = [
  "textGeneration",
  "structuredOutput",
  "imageGeneration",
  "imageEditing",
  "multiImageEditing",
  "promptEnhancement",
  "transcription",
  "wordLevelTimestamps",
  "textToSpeech",
  "streamingSpeech",
  "videoGeneration",
  "videoEditing",
  "longRunningOperations",
  "contentModeration",
];

const MOCK_MODELS: Record<string, Capability[]> = {
  "mock-full": ALL_CAPABILITIES,
  "mock-text-only": ["textGeneration", "structuredOutput", "promptEnhancement"],
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
  checkExpiry(credential);
  checkCapability(modelId, capability);
  recordCallAndCheckRateLimit(credential.connectionId);
  checkTriggers(triggerText);
  await simulateLatency();
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

  async discoverModels(): Promise<ModelDescriptor[]> {
    return Object.entries(MOCK_MODELS).map(([modelId, capabilities]) => ({
      modelId,
      displayName: modelId === "mock-full" ? "Mock (full capabilities)" : "Mock (text only)",
      capabilities,
    }));
  },

  async getCapabilities(_credential: DecryptedCredential, modelId = "mock-full"): Promise<ProviderCapabilities> {
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
      text: `Simulated response (Mock Provider) for: "${input.prompt.slice(0, 80)}"`,
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
      segments: [{ start: 0, end: 2.4, text: "This is a simulated transcript from the Mock Provider." }],
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
