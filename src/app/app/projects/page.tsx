import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { ProjectDashboard } from "@/components/app/project-dashboard";
import type { ProjectRow } from "@/app/api/projects/route";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const userId = await getOrCreateLocalUserId();
  const projects = await query<ProjectRow>(
    `select id, workflow, title, status, aspect_ratio, duration_seconds, created_at, updated_at
     from projects
     where user_id = $1
     order by updated_at desc`,
    [userId]
  );

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create, rename, archive, or delete a project. Everything here lives in your own
        local database.
      </p>
      <div className="mt-6">
        <ProjectDashboard initialProjects={projects} />
      </div>
    </div>
  );
}
