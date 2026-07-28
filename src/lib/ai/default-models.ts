import type { ProviderId } from "./types";

/**
 * Every real adapter needs a real model id, not the mock's "mock-full"
 * sentinel -- routes used to hardcode "mock-full" for every provider,
 * which only happened to work because the Mock Provider was the only one
 * tested live. Submitting "mock-full" to the real OpenAI API fails outright
 * (unknown model), so image-generating routes must resolve a real default
 * per connected provider.
 */
export function getDefaultImageModelId(provider: ProviderId): string {
  // gpt-image-1 is scheduled for shutdown (Oct 2026); gpt-image-2 is its
  // current replacement and is present in the installed SDK's ImageModel
  // union for both generate and edit.
  if (provider === "openai") return "gpt-image-2";
  return "mock-full";
}

export function getDefaultTranscriptionModelId(provider: ProviderId): string {
  if (provider === "openai") return "whisper-1";
  return "mock-full";
}

export function getDefaultTextModelId(provider: ProviderId): string {
  if (provider === "openai") return "gpt-4o-mini";
  if (provider === "google-gemini") return "gemini-2.0-flash";
  return "mock-full";
}
