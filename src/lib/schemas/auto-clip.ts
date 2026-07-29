import { z } from "zod";

export const AutoClipHighlightSchema = z
  .object({
    startSeconds: z.number().nonnegative(),
    endSeconds: z.number().positive(),
    title: z.string().min(1).max(120),
  })
  .refine((v) => v.endSeconds > v.startSeconds, {
    message: "endSeconds must be after startSeconds",
    path: ["endSeconds"],
  });

export const AutoClipHighlightsResponseSchema = z.array(AutoClipHighlightSchema).min(1).max(8);

export type AutoClipHighlight = z.infer<typeof AutoClipHighlightSchema>;

/**
 * Scans for every balanced top-level `[...]` span in the text (tracking
 * string quoting so brackets inside a title string don't confuse the
 * depth counter), rather than naively pairing the first `[` with the last
 * `]` -- that naive approach breaks the moment the model's response has
 * any bracket-shaped text before or after the real array (e.g. "Analysis
 * [not JSON]\n[{...}]" would slice out the whole span from the first `[`
 * to the final `]`, which fails to parse even though a valid array is
 * right there).
 */
function findBalancedArrayCandidates(text: string): string[] {
  const candidates: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "[") continue;
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    for (let j = i; j < text.length; j++) {
      const ch = text[j];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (ch === "\\") {
        escapeNext = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "[") depth++;
      else if (ch === "]") {
        depth--;
        if (depth === 0) {
          candidates.push(text.slice(i, j + 1));
          break;
        }
      }
    }
  }
  return candidates;
}

/**
 * Models routinely wrap JSON in prose or ```json fences even when asked not
 * to. Tries every balanced bracketed span found in the response, in order,
 * and returns the first one that both parses as JSON and validates against
 * the expected shape -- rather than assuming the model's whole response is
 * exactly one JSON array with nothing else around it.
 */
export function parseAutoClipHighlights(rawText: string): AutoClipHighlight[] {
  const candidates = findBalancedArrayCandidates(rawText);
  if (candidates.length === 0) {
    throw new Error("The AI response didn't contain a recognizable list of clips.");
  }

  for (const candidate of candidates) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      continue;
    }
    const result = AutoClipHighlightsResponseSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
  }

  throw new Error("The AI response didn't match the expected clip format.");
}
