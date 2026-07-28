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

export const CompressRequestSchema = z.object({
  crf: z.coerce.number().int().min(18).max(35),
});

const AudioFormatSchema = z.enum(["mp3", "wav", "aac"]);

export const ExtractAudioRequestSchema = z.object({
  format: AudioFormatSchema,
});

export const ConvertAudioRequestSchema = z.object({
  format: AudioFormatSchema,
});

export const NormalizeAudioRequestSchema = z.object({
  targetLufs: z.coerce.number().min(-70).max(-5),
});

export const EnhanceSpeechRequestSchema = z.object({
  strength: z.coerce.number().min(1).max(30),
});
