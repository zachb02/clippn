import { z } from "zod";

export const ProjectWorkflowSchema = z.enum([
  "auto-clip",
  "split-screen",
  "story",
  "chat",
  "streamer",
  "idea-to-short",
  "quick-subtitles",
  "manual",
]);

export const ProjectStatusSchema = z.enum([
  "draft",
  "uploading",
  "transcribing",
  "generating",
  "editing",
  "ready_to_render",
  "rendering",
  "completed",
  "failed",
  "archived",
]);

export const CreateProjectSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  workflow: ProjectWorkflowSchema.default("manual"),
});

export const UpdateProjectSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  status: ProjectStatusSchema.optional(),
});
