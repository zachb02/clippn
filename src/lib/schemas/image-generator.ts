import { z } from "zod";

export const ImageGeneratorRequestSchema = z.object({
  connectionId: z.string().uuid(),
  prompt: z.string().min(1, "Enter a prompt").max(1000),
});
