import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { CreateProjectSchema } from "@/lib/schemas/project";

export interface ProjectRow {
  id: string;
  workflow: string;
  title: string;
  status: string;
  aspect_ratio: string | null;
  duration_seconds: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  const userId = await getOrCreateLocalUserId();
  const projects = await query<ProjectRow>(
    `select id, workflow, title, status, aspect_ratio, duration_seconds, created_at, updated_at
     from projects
     where user_id = $1
     order by updated_at desc`,
    [userId]
  );
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const userId = await getOrCreateLocalUserId();
  const body = await request.json().catch(() => null);
  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const [project] = await query<ProjectRow>(
    `insert into projects (user_id, title, workflow, status)
     values ($1, $2, $3, 'draft')
     returning id, workflow, title, status, aspect_ratio, duration_seconds, created_at, updated_at`,
    [userId, parsed.data.title, parsed.data.workflow]
  );

  return NextResponse.json({ project }, { status: 201 });
}
