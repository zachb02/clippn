import { z } from "zod";

export const QuickSubtitlesRequestSchema = z.object({
  connectionId: z.string().uuid(),
  assetId: z.string().uuid(),
});
