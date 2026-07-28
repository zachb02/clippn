import { mockProvider } from "./mock-provider";
import type { AIProvider, ProviderId } from "./types";

// Phase 3 (real Google Gemini / OpenAI adapters) is not built yet -- see
// docs/architecture/12-implementation-plan.md. Every caller goes through
// this lookup rather than importing mockProvider directly, so adding a
// real adapter later is a one-line change here, not a call-site hunt.
const PROVIDERS: Partial<Record<ProviderId, AIProvider>> = {
  mock: mockProvider,
};

export function getProvider(providerId: ProviderId): AIProvider {
  const provider = PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`The ${providerId} adapter isn't implemented yet. Use the Mock Provider for now.`);
  }
  return provider;
}
