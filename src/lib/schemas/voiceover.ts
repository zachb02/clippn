import { z } from "zod";

export const VoiceoverRequestSchema = z.object({
  connectionId: z.string().uuid(),
  script: z.string().min(1, "Enter a script").max(2000),
});
