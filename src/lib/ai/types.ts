export type Capability =
  | "textGeneration"
  | "structuredOutput"
  | "imageGeneration"
  | "imageEditing"
  | "multiImageEditing"
  | "promptEnhancement"
  | "transcription"
  | "wordLevelTimestamps"
  | "textToSpeech"
  | "streamingSpeech"
  | "videoGeneration"
  | "videoEditing"
  | "longRunningOperations"
  | "contentModeration";

export type ProviderId = "google-gemini" | "openai" | "mock";

export interface ProviderCapabilities {
  provider: ProviderId;
  modelId: string;
  capabilities: Capability[];
  discoveredAt: string;
}

export interface ModelDescriptor {
  modelId: string;
  displayName: string;
  capabilities: Capability[];
}

/**
 * Exists only in worker/server process memory for the lifetime of a single
 * provider call. Never serialized to a queue payload, log line, or response body.
 */
export interface DecryptedCredential {
  connectionId: string;
  provider: ProviderId;
  apiKey: string;
  expiresAt?: string;
}

export type ProviderErrorCategory =
  | "invalid_credential"
  | "expired_credential"
  | "permission_denied"
  | "rate_limited"
  | "unsafe_content"
  | "unsupported_capability"
  | "provider_unavailable"
  | "unknown";

export interface NormalizedProviderError {
  category: ProviderErrorCategory;
  message: string;
  retryable: boolean;
}

export interface CredentialValidationResult {
  valid: boolean;
  reason?: string;
  maskedEnding?: string;
}

export interface TextGenerationInput {
  prompt: string;
  modelId: string;
}

export interface TextGenerationResult {
  text: string;
  modelId: string;
  mock?: true;
}

export interface StructuredGenerationInput<T> {
  prompt: string;
  modelId: string;
  schemaName: string;
  exampleShape?: T;
}

export interface ImageGenerationInput {
  prompt: string;
  modelId: string;
}

export interface ImageGenerationResult {
  imageUrl: string;
  modelId: string;
  mock?: true;
}

export interface ImageEditInput {
  prompt: string;
  modelId: string;
  sourceImageUrl: string;
}

export interface TranscriptionInput {
  audioUrl: string;
  modelId: string;
}

export interface TranscriptResult {
  text: string;
  segments: { start: number; end: number; text: string }[];
  modelId: string;
  mock?: true;
}

export interface SpeechSynthesisInput {
  text: string;
  modelId: string;
  voiceId?: string;
}

export interface SpeechResult {
  audioUrl: string;
  modelId: string;
  mock?: true;
}

export interface VideoGenerationInput {
  prompt: string;
  modelId: string;
}

export interface ProviderJob {
  providerJobId: string;
  status: "queued" | "processing" | "completed" | "failed";
}

export interface ProviderJobStatus {
  status: "queued" | "processing" | "completed" | "failed";
  resultUrl?: string;
  error?: NormalizedProviderError;
}

/**
 * Implemented identically by every adapter (google-gemini, openai, mock).
 * Optional methods are omitted entirely by adapters/models that don't
 * support them -- the UI gates on `getCapabilities()`, never on `typeof`.
 */
export interface AIProvider {
  id: ProviderId;

  validateCredential(credential: DecryptedCredential): Promise<CredentialValidationResult>;
  discoverModels(credential: DecryptedCredential): Promise<ModelDescriptor[]>;
  getCapabilities(credential: DecryptedCredential, modelId?: string): Promise<ProviderCapabilities>;

  generateText?(input: TextGenerationInput, credential: DecryptedCredential): Promise<TextGenerationResult>;
  generateStructuredOutput?<T>(input: StructuredGenerationInput<T>, credential: DecryptedCredential): Promise<T>;
  generateImage?(input: ImageGenerationInput, credential: DecryptedCredential): Promise<ImageGenerationResult>;
  editImage?(input: ImageEditInput, credential: DecryptedCredential): Promise<ImageGenerationResult>;
  transcribeAudio?(input: TranscriptionInput, credential: DecryptedCredential): Promise<TranscriptResult>;
  synthesizeSpeech?(input: SpeechSynthesisInput, credential: DecryptedCredential): Promise<SpeechResult>;
  createVideoJob?(input: VideoGenerationInput, credential: DecryptedCredential): Promise<ProviderJob>;
  getJobStatus?(providerJobId: string, credential: DecryptedCredential): Promise<ProviderJobStatus>;

  normalizeError(error: unknown): NormalizedProviderError;
}
