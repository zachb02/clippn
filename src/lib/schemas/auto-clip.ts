import { z } from "zod";

export const AutoClipHighlightSchema = z.object({
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
  title: z.string().min(1).max(120),
});

export const AutoClipHighlightsResponseSchema = z.array(AutoClipHighlightSchema).min(1).max(8);

export type AutoClipHighlight = z.infer<typeof AutoClipHighlightSchema>;

/**
 * Models routinely wrap JSON in prose or ```json fences even when asked not
 * to -- this extracts the first plausible JSON array from the raw text
 * before handing it to Zod, rather than assuming `JSON.parse` on the raw
 * response will just work.
 */
export function parseAutoClipHighlights(rawText: string): AutoClipHighlight[] {
  const start = rawText.indexOf("[");
  const end = rawText.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("The AI response didn't contain a recognizable list of clips.");
  }
  const candidate = rawText.slice(start, end + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error("The AI response wasn't valid JSON.");
  }

  const result = AutoClipHighlightsResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("The AI response didn't match the expected clip format.");
  }
  return result.data;
}
