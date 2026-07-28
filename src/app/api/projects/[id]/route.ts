import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { UpdateProjectSchema } from "@/lib/schemas/project";
import type { ProjectRow } from "../route";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getOrCreateLocalUserId();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (parsed.data.title !== undefined) {
    setClauses.push(`title = $${paramIndex++}`);
    values.push(parsed.data.title);
  }
  if (parsed.data.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(parsed.data.status);
  }
  setClauses.push(`updated_at = now()`);

  values.push(id, userId);
  const [project] = await query<ProjectRow>(
    `update projects set ${setClauses.join(", ")}
     where id = $${paramIndex++} and user_id = $${paramIndex}
     returning id, workflow, title, status, aspect_ratio, duration_seconds, created_at, updated_at`,
    values
  );

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getOrCreateLocalUserId();
  const { id } = await params;
  await query(`delete from projects where id = $1 and user_id = $2`, [id, userId]);
  return NextResponse.json({ deleted: true });
}
