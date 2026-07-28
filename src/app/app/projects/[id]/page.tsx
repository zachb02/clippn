import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { Badge } from "@/components/ui/badge";
import type { ProjectRow } from "@/app/api/projects/route";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getOrCreateLocalUserId();

  const [project] = await query<ProjectRow>(
    `select id, workflow, title, status, aspect_ratio, duration_seconds, created_at, updated_at
     from projects where id = $1 and user_id = $2`,
    [id, userId]
  );

  if (!project) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
        <Badge variant="outline">{project.workflow}</Badge>
        <Badge>{project.status}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Updated {new Date(project.updated_at).toLocaleString()}
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-border/60 p-12 text-center">
        <p className="text-sm text-muted-foreground">
          The timeline editor for this project isn&apos;t built yet in Phase 1. Cutting,
          cropping, captions, and export live on the timeline/render pipeline designed
          in docs/architecture and slotted for a later phase.
        </p>
      </div>
    </div>
  );
}
