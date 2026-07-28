import { mockProvider } from "./mock-provider";
import { geminiProvider } from "./gemini-provider";
import { openaiProvider } from "./openai-provider";
import type { AIProvider, ProviderId } from "./types";

// Every caller goes through this lookup rather than importing a specific
// adapter directly, so swapping/adding an adapter is a one-line change
// here, not a call-site hunt. Gemini and OpenAI implement text generation
// (and OpenAI implements image generation) against the real SDKs -- see
// the "Phase 3 scope, honestly" comment at the top of each adapter file
// for exactly what is and isn't implemented, and the fact that neither
// has been exercised against a real API key in this sandbox.
const PROVIDERS: Partial<Record<ProviderId, AIProvider>> = {
  mock: mockProvider,
  "google-gemini": geminiProvider,
  openai: openaiProvider,
};

export function getProvider(providerId: ProviderId): AIProvider {
  const provider = PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`The ${providerId} adapter isn't implemented yet. Use the Mock Provider for now.`);
  }
  return provider;
}
