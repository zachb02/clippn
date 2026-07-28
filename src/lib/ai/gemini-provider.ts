import { ApiError, GoogleGenAI } from "@google/genai";
import type {
  AIProvider,
  Capability,
  CredentialValidationResult,
  DecryptedCredential,
  ModelDescriptor,
  NormalizedProviderError,
  ProviderCapabilities,
  ProviderErrorCategory,
  TextGenerationInput,
  TextGenerationResult,
} from "./types";

/**
 * Real Google Gemini adapter against the official @google/genai SDK.
 *
 * Phase 3 scope, honestly: text generation and model discovery are
 * implemented and structurally correct against the SDK's actual types --
 * image generation, transcription, and speech synthesis are NOT
 * implemented yet (left undefined, per the AIProvider contract's "gate on
 * capabilities" design, rather than half-implemented against multimodal
 * APIs this pass didn't have time to plumb correctly, in particular audio
 * bytes: TranscriptionInput/SpeechSynthesisInput currently carry a URL
 * reference, not raw bytes, and neither Gemini's nor OpenAI's SDK accepts
 * a bare URL for those calls).
 *
 * This code has never been run against a real Gemini API key in this
 * sandbox -- no key was available to test with. It is written correctly
 * against the SDK's type definitions and this file compiles and typechecks,
 * but live verification (does validateCredential actually reject a bad
 * key, does generateText actually return real Gemini output) requires a
 * real GOOGLE_API_KEY / Gemini API key, which this environment doesn't have.
 */

// Capabilities that generateText below can actually satisfy for any
// standard Gemini text model -- not a claim about the full Gemini feature
// set, just what this adapter currently implements.
const IMPLEMENTED_CAPABILITIES: Capability[] = ["textGeneration", "promptEnhancement"];

function inferCapabilities(modelName: string): Capability[] {
  const lower = modelName.toLowerCase();
  if (lower.includes("imagen")) return ["imageGeneration", "imageEditing"];
  if (lower.includes("tts")) return ["textToSpeech"];
  if (lower.includes("gemini")) return IMPLEMENTED_CAPABILITIES;
  return [];
}

function normalizeGeminiError(error: unknown): NormalizedProviderError {
  const message = error instanceof Error ? error.message : String(error);

  // The SDK throws a typed ApiError with a real HTTP status for every 4xx/5xx
  // response (node_modules/@google/genai/dist/node/node.d.ts). Prefer that
  // over string-matching the message: message-text heuristics are fragile --
  // e.g. a bare `.includes("rate")` also matches the substring inside
  // "generateContent", mislabeling unrelated errors as rate_limited.
  if (error instanceof ApiError) {
    const status = error.status;
    const lower = message.toLowerCase();
    let category: ProviderErrorCategory = "unknown";
    // Gemini's actual invalid-key response is HTTP 400 with API_KEY_INVALID
    // in the body, not 401 -- confirmed against the installed SDK. Check
    // this before the generic 400-is-safety-rejection branch below, or a
    // real invalid key falls through to "unknown" instead of being
    // recognized.
    if (status === 400 && (lower.includes("api key not valid") || lower.includes("api_key_invalid"))) {
      category = "invalid_credential";
    } else if (status === 401) category = "invalid_credential";
    else if (status === 403) category = "permission_denied";
    else if (status === 429) category = "rate_limited";
    else if (status === 408 || status === 500 || status === 502 || status === 503 || status === 504) {
      category = "provider_unavailable";
    } else if (status === 400 && lower.includes("safety")) category = "unsafe_content";
    const retryable = category === "rate_limited" || category === "provider_unavailable";
    return { category, message, retryable };
  }

  // Fallback for non-ApiError throws (e.g. a network error before the SDK
  // could even attach a status). Kept narrow and phrase-based, not
  // single-word substring matching, to avoid the same false-positive class.
  const lower = message.toLowerCase();
  let category: ProviderErrorCategory = "unknown";
  if (lower.includes("api key not valid") || lower.includes("api_key_invalid")) {
    category = "invalid_credential";
  } else if (lower.includes("permission denied")) {
    category = "permission_denied";
  } else if (lower.includes("rate limit") || lower.includes("quota exceeded")) {
    category = "rate_limited";
  } else if (lower.includes("safety") || lower.includes("blocked")) {
    category = "unsafe_content";
  } else if (lower.includes("unavailable") || lower.includes("econnrefused") || lower.includes("etimedout") || lower.includes("fetch failed")) {
    category = "provider_unavailable";
  }

  const retryable = category === "rate_limited" || category === "provider_unavailable";
  return { category, message, retryable };
}

function client(credential: DecryptedCredential): GoogleGenAI {
  return new GoogleGenAI({ apiKey: credential.apiKey });
}

export const geminiProvider: AIProvider = {
  id: "google-gemini",

  async validateCredential(credential: DecryptedCredential): Promise<CredentialValidationResult> {
    try {
      const ai = client(credential);
      // The cheapest real call available: listing models validates the key
      // without spending generation tokens, matching the threat model's
      // "smallest practical request" guidance for validateCredential. The
      // SDK fetches the first page as part of this call (Pager.page is a
      // synchronous getter over an already-fetched page, not itself a
      // request), so an invalid key throws here.
      await ai.models.list({ config: { pageSize: 1 } });
      return { valid: true, maskedEnding: credential.apiKey.slice(-4) };
    } catch (error) {
      const normalized = normalizeGeminiError(error);
      return { valid: false, reason: normalized.category };
    }
  },

  async discoverModels(credential: DecryptedCredential): Promise<ModelDescriptor[]> {
    const ai = client(credential);
    const pager = await ai.models.list();
    const models: ModelDescriptor[] = [];
    for await (const model of pager) {
      const modelId = (model.name ?? "").replace(/^models\//, "");
      if (!modelId) continue;
      models.push({
        modelId,
        displayName: model.displayName ?? modelId,
        capabilities: inferCapabilities(modelId),
      });
    }
    return models;
  },

  async getCapabilities(_credential: DecryptedCredential, modelId = "gemini-2.0-flash"): Promise<ProviderCapabilities> {
    return {
      provider: "google-gemini",
      modelId,
      capabilities: inferCapabilities(modelId),
      discoveredAt: new Date().toISOString(),
    };
  },

  async generateText(input: TextGenerationInput, credential: DecryptedCredential): Promise<TextGenerationResult> {
    const ai = client(credential);
    const response = await ai.models.generateContent({
      model: input.modelId,
      contents: input.prompt,
    });
    return { text: response.text ?? "", modelId: input.modelId };
  },

  normalizeError: normalizeGeminiError,
};
