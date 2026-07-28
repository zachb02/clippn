import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { TimelineSpec } from "@/lib/timeline/schema";

const ProjectIdSchema = z.string().uuid();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getOrCreateLocalUserId();
  const { id } = await params;
  const parsedId = ProjectIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const [project] = await query<{ timeline: unknown }>(
    `select timeline from projects where id = $1 and user_id = $2`,
    [parsedId.data, userId]
  );
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ timeline: project.timeline });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getOrCreateLocalUserId();
  const { id } = await params;
  const parsedId = ProjectIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = TimelineSpec.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid timeline." }, { status: 400 });
  }

  // Every clip.assetId (if set) must reference an asset this project actually
  // owns -- checked server-side on every save, not just at upload time, per
  // docs/architecture/08-timeline-json-schema.md's stated invariant.
  const assetIds = [...new Set(parsed.data.clips.map((c) => c.assetId).filter((v): v is string => v !== null))];
  if (assetIds.length > 0) {
    const owned = await query<{ id: string }>(
      `select id from assets where project_id = $1 and user_id = $2 and id = any($3::uuid[])`,
      [parsedId.data, userId, assetIds]
    );
    if (owned.length !== assetIds.length) {
      return NextResponse.json({ error: "Timeline references an asset that isn't part of this project." }, { status: 400 });
    }
  }

  const [project] = await query<{ id: string }>(
    `update projects set timeline = $1, updated_at = now() where id = $2 and user_id = $3 returning id`,
    [JSON.stringify(parsed.data), parsedId.data, userId]
  );
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ saved: true });
}
