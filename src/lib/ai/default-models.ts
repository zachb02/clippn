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
  if (provider === "openai") return "gpt-image-1";
  return "mock-full";
}

export function getDefaultTranscriptionModelId(provider: ProviderId): string {
  if (provider === "openai") return "whisper-1";
  return "mock-full";
}
