import { createReadStream } from "fs";
import OpenAI, { toFile } from "openai";
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
  TextGenerationInput,
  TextGenerationResult,
  TranscriptionInput,
  TranscriptResult,
} from "./types";

/**
 * Real OpenAI adapter against the official `openai` SDK.
 *
 * Phase 3/4 scope, honestly: text generation, model discovery, image
 * generation, image editing, and transcription are implemented and
 * structurally correct against the SDK's actual types -- speech synthesis
 * is NOT implemented yet (client.audio.speech.create returns bytes, but
 * there's no local-file destination wired for it yet the way transcription
 * has one on the input side).
 *
 * Neither editImage nor transcribeAudio ever fetches a URL server-side --
 * that's a deliberate SSRF-avoidance choice, not an oversight. Each takes
 * its bytes from a source the caller already trusts by construction:
 * editImage requires a data: URL (browser-uploaded bytes), and
 * transcribeAudio requires audioUrl to be an absolute local filesystem path
 * that the caller has already resolved through
 * `resolveStoragePath`/`STORAGE_ROOT` containment (see
 * src/lib/storage/local-storage.ts) -- never a raw user-supplied string.
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
  else if (status === 408 || (status && status >= 500)) category = "provider_unavailable";

  const retryable = category === "rate_limited" || category === "provider_unavailable";
  return { category, message, retryable };
}

function client(credential: DecryptedCredential): OpenAI {
  return new OpenAI({ apiKey: credential.apiKey });
}

const DATA_URL_PATTERN = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i;

/**
 * editImage only accepts a data: URL for the source image (the browser
 * reads the user's uploaded file and base64-encodes it client-side) --
 * never a remote http(s) URL fetched server-side. The security model
 * explicitly bans accepting a user-supplied URL for a server-side fetch
 * (SSRF surface); requiring a data: URL sidesteps that risk entirely
 * rather than trying to allowlist-validate an arbitrary URL.
 */
function decodeSourceImage(sourceImageUrl: string): { buffer: Buffer; mimeType: string; extension: string } {
  const match = DATA_URL_PATTERN.exec(sourceImageUrl);
  if (!match) {
    throw new Error("Only a directly-uploaded image is supported for editing right now.");
  }
  const mimeType = match[1] ?? "image/png";
  const base64 = match[2] ?? "";
  const extension = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1] ?? "png";
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) {
    throw new Error("Uploaded image data is empty or invalid.");
  }
  return { buffer, mimeType, extension };
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

  async editImage(input: ImageEditInput, credential: DecryptedCredential): Promise<ImageGenerationResult> {
    const openai = client(credential);
    const { buffer, mimeType, extension } = decodeSourceImage(input.sourceImageUrl);
    const file = await toFile(buffer, `source.${extension}`, { type: mimeType });
    const response = await openai.images.edit({
      model: input.modelId,
      image: file,
      prompt: input.prompt,
    });
    const image = response.data?.[0];
    const imageUrl = image?.url ?? (image?.b64_json ? `data:image/png;base64,${image.b64_json}` : "");
    return { imageUrl, modelId: input.modelId };
  },

  async transcribeAudio(input: TranscriptionInput, credential: DecryptedCredential): Promise<TranscriptResult> {
    const openai = client(credential);
    const response = await openai.audio.transcriptions.create({
      file: createReadStream(input.audioUrl),
      model: input.modelId,
      response_format: "verbose_json",
    });
    const segments = (response.segments ?? []).map((segment) => ({
      start: segment.start,
      end: segment.end,
      text: segment.text,
    }));
    return { text: response.text, segments, modelId: input.modelId };
  },

  normalizeError: normalizeOpenAiError,
};
