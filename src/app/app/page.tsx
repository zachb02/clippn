import Link from "next/link";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { Button } from "@/components/ui/button";
import type { ProjectRow } from "@/app/api/projects/route";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await getOrCreateLocalUserId();
  const [recent] = await query<{ count: string }>(
    `select count(*) from projects where user_id = $1`,
    [userId]
  );
  const projectCount = Number(recent?.count ?? 0);

  const recentProjects = await query<ProjectRow>(
    `select id, workflow, title, status, aspect_ratio, duration_seconds, created_at, updated_at
     from projects where user_id = $1 order by updated_at desc limit 5`,
    [userId]
  );

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {projectCount === 0
          ? "You don't have any projects yet."
          : `You have ${projectCount} project${projectCount === 1 ? "" : "s"}.`}
      </p>
      <Button
        className="mt-4"
        nativeButton={false}
        render={<Link href="/app/projects">Go to projects</Link>}
      />

      {recentProjects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground">Recent</h2>
          <ul className="mt-3 space-y-2">
            {recentProjects.map((project) => (
              <li
                key={project.id}
                className="rounded-lg border border-border/60 bg-card px-4 py-3 text-sm"
              >
                {project.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
