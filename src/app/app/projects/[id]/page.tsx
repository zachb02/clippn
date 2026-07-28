import { notFound } from "next/navigation";
import { z } from "zod";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { EditorShell } from "@/components/editor/editor-shell";
import { TimelineSpec } from "@/lib/timeline/schema";
import type { ProjectAsset } from "@/components/editor/asset-panel";

export const dynamic = "force-dynamic";

const ProjectIdSchema = z.string().uuid();

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = ProjectIdSchema.safeParse(id);
  if (!parsedId.success) {
    notFound();
  }
  const userId = await getOrCreateLocalUserId();

  const [project] = await query<{ timeline: unknown }>(
    `select timeline from projects where id = $1 and user_id = $2`,
    [parsedId.data, userId]
  );
  if (!project) {
    notFound();
  }

  const assets = await query<ProjectAsset>(
    `select id, kind, storage_path, original_filename, duration_seconds, width, height
     from assets where project_id = $1 and user_id = $2 and deleted_at is null
     order by created_at desc`,
    [parsedId.data, userId]
  );

  const parsedTimeline = TimelineSpec.safeParse(project.timeline);

  return (
    <EditorShell
      projectId={parsedId.data}
      initialTimeline={parsedTimeline.success ? parsedTimeline.data : null}
      initialAssets={assets}
    />
  );
}
