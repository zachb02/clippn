import { z } from "zod";

export const copyrightRequestSchema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  email: z.email("Enter a valid email address."),
  description: z
    .string()
    .trim()
    .min(10, "Describe the work in at least 10 characters."),
  assetUrl: z
    .string()
    .trim()
    .min(1, "Enter the URL or asset identifier of the content in question."),
  goodFaith: z.boolean().refine((v) => v === true, {
    message: "You must confirm this statement to submit a request.",
  }),
  signature: z.string().trim().min(1, "Type your full name as signature."),
});

export type CopyrightRequestInput = z.infer<typeof copyrightRequestSchema>;

export const likenessRemovalRequestSchema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  email: z.email("Enter a valid email address."),
  description: z
    .string()
    .trim()
    .min(10, "Describe the content in at least 10 characters."),
  assetUrl: z
    .string()
    .trim()
    .min(1, "Enter the URL or asset identifier of the content in question."),
  relationship: z
    .string()
    .trim()
    .min(1, "Describe your relationship to the person depicted."),
  attestation: z.boolean().refine((v) => v === true, {
    message: "You must confirm this statement to submit a request.",
  }),
});

export type LikenessRemovalRequestInput = z.infer<
  typeof likenessRemovalRequestSchema
>;

export const dataDeletionRequestSchema = z.object({
  email: z.email("Enter the email address on your account."),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
  confirm: z.boolean().refine((v) => v === true, {
    message: "You must confirm this statement to submit a request.",
  }),
});

export type DataDeletionRequestInput = z.infer<typeof dataDeletionRequestSchema>;
