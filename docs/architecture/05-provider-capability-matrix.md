# Provider Capability Matrix

## Normalized capabilities

```ts
type Capability =
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

interface ProviderCapabilities {
  provider: "google-gemini" | "openai" | "mock";
  modelId: string;
  capabilities: Capability[];
  discoveredAt: string; // ISO timestamp, from live discovery, not hardcoded
}
```

Capabilities are **never hardcoded per provider** — they come from
`discoverModels()` + `getCapabilities()` at connection time and are re-validated
periodically (`last_validated_at`), because providers add/remove/deprecate models
independently of this codebase's release cycle.

## Known baseline (informational only — actual availability always comes from live
## discovery against the user's own credential and account entitlements)

| Capability | Google Gemini | OpenAI | Mock |
|---|---|---|---|
| textGeneration | yes | yes | yes |
| structuredOutput | yes | yes | yes |
| imageGeneration | yes (Nano Banana-class models, if available to account) | yes | yes |
| imageEditing | yes | yes | yes |
| multiImageEditing | model-dependent | model-dependent | yes |
| promptEnhancement | via textGeneration | via textGeneration | yes |
| transcription | model-dependent | yes | yes |
| wordLevelTimestamps | model-dependent | model-dependent | yes |
| textToSpeech | model-dependent | yes | yes |
| streamingSpeech | model-dependent | model-dependent | yes |
| videoGeneration | model-dependent, account-gated | model-dependent, account-gated | yes (simulated) |
| videoEditing | no (as of this writing) | no (as of this writing) | yes (simulated) |
| longRunningOperations | yes | yes | yes |
| contentModeration | yes | yes | yes |

Every "model-dependent"/"account-gated" cell means: **the UI must not show the control
as available until `getCapabilities()` for the user's specific connected credential and
selected model confirms it.** A feature flag or version bump in this table is a
starting hint for `model_catalog`, never a substitute for runtime discovery.

## `AIProvider` interface (implemented identically by all three adapters)

```ts
interface AIProvider {
  id: "google-gemini" | "openai" | "mock";

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
```

`DecryptedCredential` only ever exists in worker process memory for the duration of a
single provider call — see `06-credential-threat-model.md`.

## `MediaProcessor` interface (local, no AI key required, always available)

```ts
interface MediaProcessor {
  inspectMedia(input: StoredAsset): Promise<MediaMetadata>;
  transcode(input: TranscodeInput): Promise<StoredAsset>;
  trim(input: TrimInput): Promise<StoredAsset>;
  crop(input: CropInput): Promise<StoredAsset>;
  compose(input: CompositionInput): Promise<StoredAsset>;
  extractAudio(input: StoredAsset): Promise<StoredAsset>;
  normalizeAudio(input: AudioNormalizeInput): Promise<StoredAsset>;
  separateStems?(input: StoredAsset): Promise<StemResult>;
  removeBackground?(input: BackgroundRemovalInput): Promise<StoredAsset>;
  removeBurnedSubtitles?(input: SubtitleRemovalInput): Promise<StoredAsset>;
}
```

Phase 1 implements `inspectMedia`, `trim`, `crop` for real against local ffmpeg/ffprobe.
The rest are designed against this same interface and land in later phases.

## Mock Provider — required simulated behaviors (Phase 1, fully implemented)

| Scenario | Trigger | Behavior |
|---|---|---|
| Success | default | Returns deterministic, clearly-labeled mock content after a simulated delay |
| Latency | always | 400-2500ms randomized delay before resolving, to exercise loading states |
| Failure | prompt/input contains `__mock_fail__` | Rejects with a generic provider error |
| Rate limited | 6th call within 60s from one connection | Rejects with `rate_limited` |
| Safety rejection | prompt/input contains `__mock_unsafe__` | Rejects with a moderation-style error |
| Unsupported capability | calling a method the mock model doesn't declare | Rejects with `unsupported_capability`, same as a real adapter would |
| Expired credential | connection's `expires_at` is in the past | Rejects with `expired_credential` before attempting any call |

Every mock result includes `"mock": true` in its metadata and a visible "Simulated
result (Mock Provider)" badge in the UI — never presented as real generated content.
