import { NextResponse } from "next/server";
import { z } from "zod";
import { mkdtemp, rm, readFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { TimelineSpec } from "@/lib/timeline/schema";
import { renderTimeline } from "@/lib/timeline/render";
import { resolveStoragePath } from "@/lib/storage/local-storage";

const ProjectIdSchema = z.string().uuid();

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getOrCreateLocalUserId();
  const { id } = await params;
  const parsedId = ProjectIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const [project] = await query<{ timeline: unknown; title: string }>(
    `select timeline, title from projects where id = $1 and user_id = $2`,
    [parsedId.data, userId]
  );
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  const parsedTimeline = TimelineSpec.safeParse(project.timeline);
  if (!parsedTimeline.success) {
    return NextResponse.json({ error: "This project has no valid timeline to render yet." }, { status: 400 });
  }

  const clipAssetIds = [
    ...new Set(parsedTimeline.data.clips.map((c) => c.assetId).filter((v): v is string => v !== null)),
  ];
  const assets = await query<{ id: string; storage_path: string }>(
    `select id, storage_path from assets where project_id = $1 and user_id = $2 and id = any($3::uuid[])`,
    [parsedId.data, userId, clipAssetIds]
  );
  const assetPathById = new Map(assets.map((a) => [a.id, resolveStoragePath(a.storage_path)]));

  const workDir = await mkdtemp(path.join(tmpdir(), "clippn-render-"));
  try {
    const outputPath = path.join(workDir, "output.mp4");
    await renderTimeline(
      parsedTimeline.data,
      (assetId) => {
        const resolved = assetPathById.get(assetId);
        if (!resolved) throw new Error("A clip references an asset that no longer exists.");
        return resolved;
      },
      workDir,
      outputPath
    );

    const outputBuffer = await readFile(outputPath);
    const safeTitle = project.title.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60) || "clippn-export";
    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${safeTitle}.mp4"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not render this project.";
    return NextResponse.json({ error: message }, { status: 422 });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
