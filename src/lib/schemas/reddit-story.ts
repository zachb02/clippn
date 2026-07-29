import { z } from "zod";

export const RedditStoryRequestSchema = z.object({
  connectionId: z.string().uuid(),
  topic: z.string().min(1, "Enter a topic or idea").max(500),
});
