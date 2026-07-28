import { z } from "zod";

export const ContentBrainstormRequestSchema = z.object({
  connectionId: z.string().uuid(),
  topic: z.string().min(1, "Enter a topic").max(500),
});
