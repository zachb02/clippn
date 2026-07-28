import { z } from "zod";

export const TrimRequestSchema = z.object({
  startSeconds: z.coerce.number().min(0),
  durationSeconds: z.coerce.number().positive(),
});

export const CropRequestSchema = z.object({
  x: z.coerce.number().int().min(0),
  y: z.coerce.number().int().min(0),
  width: z.coerce.number().int().positive(),
  height: z.coerce.number().int().positive(),
});
