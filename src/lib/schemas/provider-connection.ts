import { z } from "zod";

export const ProviderIdSchema = z.enum(["google-gemini", "openai", "mock"]);

/**
 * Guards against the single most common BYOK mistake: pasting an account
 * password, session cookie, or OAuth token instead of a provider API key.
 * Not foolproof, but catches the obvious cases before they're ever sent.
 */
const REJECTED_PATTERNS = [
  /^ya29\./, // Google OAuth access token
  /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, // raw JWT
  /session|cookie|password/i,
];

export const CreateConnectionSchema = z.object({
  provider: ProviderIdSchema,
  label: z.string().min(1).max(80),
  apiKey: z
    .string()
    .min(1, "API key is required")
    .max(4096)
    .refine((value) => !REJECTED_PATTERNS.some((pattern) => pattern.test(value)), {
      message:
        "This looks like an account password, session cookie, or OAuth token, not an API key. Paste your provider API key instead.",
    }),
  storageMode: z.enum(["session", "remembered"]),
});

export type CreateConnectionInput = z.infer<typeof CreateConnectionSchema>;
