import OpenAI from "openai";
import type {
  AIProvider,
  Capability,
  CredentialValidationResult,
  DecryptedCredential,
  ImageGenerationInput,
  ImageGenerationResult,
  ModelDescriptor,
  NormalizedProviderError,
  ProviderCapabilities,
  ProviderErrorCategory,
  TextGenerationInput,
  TextGenerationResult,
} from "./types";

/**
 * Real OpenAI adapter against the official `openai` SDK.
 *
 * Phase 3 scope, honestly: text generation, model discovery, and image
 * generation are implemented and structurally correct against the SDK's
 * actual types -- transcription and speech synthesis are NOT implemented
 * yet. Both need real audio bytes (client.audio.transcriptions.create
 * takes a file/Blob, client.audio.speech.create returns one), but
 * TranscriptionInput/SpeechSynthesisInput currently only carry a URL
 * reference, not bytes -- wiring that through needs the credential-
 * resolution service to also fetch/stream the referenced asset, which is
 * a real follow-on task, not something to fake here.
 *
 * This code has never been run against a real OpenAI API key in this
 * sandbox -- no key was available to test with. It is written correctly
 * against the SDK's type definitions and this file compiles and typechecks,
 * but live verification (does validateCredential actually reject a bad
 * key, does generateText actually return real output) requires a real
 * OPENAI_API_KEY, which this environment doesn't have.
 */

const IMPLEMENTED_CAPABILITIES: Capability[] = ["textGeneration", "promptEnhancement"];

function inferCapabilities(modelId: string): Capability[] {
  const lower = modelId.toLowerCase();
  if (lower.includes("dall-e") || lower.includes("gpt-image")) return ["imageGeneration", "imageEditing"];
  if (lower.includes("whisper")) return ["transcription"];
  if (lower.includes("tts")) return ["textToSpeech"];
  if (lower.startsWith("gpt-") || lower.startsWith("o1") || lower.startsWith("o3") || lower.startsWith("o4")) {
    return IMPLEMENTED_CAPABILITIES;
  }
  return [];
}

function normalizeOpenAiError(error: unknown): NormalizedProviderError {
  const message = error instanceof Error ? error.message : String(error);

  // APIConnectionError/APIConnectionTimeoutError (real network/timeout
  // failures, not auth rejections) deliberately have `status: undefined` --
  // see node_modules/openai/core/error.d.ts. Without this check they'd fall
  // through to "unknown"/non-retryable, and validateCredential would report
  // a perfectly valid key as invalid just because the network hiccuped.
  if (error instanceof OpenAI.APIConnectionError) {
    return { category: "provider_unavailable", message, retryable: true };
  }

  const status = (error as { status?: number } | null)?.status;
  let category: ProviderErrorCategory = "unknown";
  if (status === 401) category = "invalid_credential";
  else if (status === 403) category = "permission_denied";
  else if (status === 429) category = "rate_limited";
  else if (status === 400 && message.toLowerCase().includes("safety")) category = "unsafe_content";
  else if (status && status >= 500) category = "provider_unavailable";

  const retryable = category === "rate_limited" || category === "provider_unavailable";
  return { category, message, retryable };
}

function client(credential: DecryptedCredential): OpenAI {
  return new OpenAI({ apiKey: credential.apiKey });
}

export const openaiProvider: AIProvider = {
  id: "openai",

  async validateCredential(credential: DecryptedCredential): Promise<CredentialValidationResult> {
    try {
      const openai = client(credential);
      // Listing models is the smallest practical request that still proves
      // the key actually works, per the threat model's validateCredential
      // guidance.
      await openai.models.list();
      return { valid: true, maskedEnding: credential.apiKey.slice(-4) };
    } catch (error) {
      const normalized = normalizeOpenAiError(error);
      return { valid: false, reason: normalized.category };
    }
  },

  async discoverModels(credential: DecryptedCredential): Promise<ModelDescriptor[]> {
    const openai = client(credential);
    const page = await openai.models.list();
    const models: ModelDescriptor[] = [];
    for await (const model of page) {
      models.push({
        modelId: model.id,
        displayName: model.id,
        capabilities: inferCapabilities(model.id),
      });
    }
    return models;
  },

  async getCapabilities(_credential: DecryptedCredential, modelId = "gpt-4o-mini"): Promise<ProviderCapabilities> {
    return {
      provider: "openai",
      modelId,
      capabilities: inferCapabilities(modelId),
      discoveredAt: new Date().toISOString(),
    };
  },

  async generateText(input: TextGenerationInput, credential: DecryptedCredential): Promise<TextGenerationResult> {
    const openai = client(credential);
    const completion = await openai.chat.completions.create({
      model: input.modelId,
      messages: [{ role: "user", content: input.prompt }],
    });
    return { text: completion.choices[0]?.message?.content ?? "", modelId: input.modelId };
  },

  async generateImage(input: ImageGenerationInput, credential: DecryptedCredential): Promise<ImageGenerationResult> {
    const openai = client(credential);
    const response = await openai.images.generate({
      model: input.modelId,
      prompt: input.prompt,
      n: 1,
    });
    const image = response.data?.[0];
    const imageUrl = image?.url ?? (image?.b64_json ? `data:image/png;base64,${image.b64_json}` : "");
    return { imageUrl, modelId: input.modelId };
  },

  normalizeError: normalizeOpenAiError,
};
