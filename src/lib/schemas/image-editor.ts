import { z } from "zod";

const DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|webp);base64,/i;

export const ImageEditorRequestSchema = z.object({
  connectionId: z.string().uuid(),
  prompt: z.string().min(1, "Enter a prompt").max(1000),
  sourceImageUrl: z
    .string()
    .min(1, "Upload an image to edit")
    .max(15_000_000, "Image is too large")
    .refine((value) => DATA_URL_PATTERN.test(value), "Upload a PNG, JPEG, or WebP image"),
});
