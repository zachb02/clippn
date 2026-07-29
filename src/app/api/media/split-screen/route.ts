import { NextResponse } from "next/server";
import { mkdtemp, rm, writeFile, readFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { inspectMedia, renderSplitScreen } from "@/lib/media/ffmpeg";
import { generateDownloadFilename } from "@/lib/media/temp-job";
import { SplitScreenRequestSchema } from "@/lib/schemas/media-tools";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const topFile = formData?.get("topFile");
  const bottomFile = formData?.get("bottomFile");
  if (!(topFile instanceof File) || !(bottomFile instanceof File)) {
    return NextResponse.json({ error: "Provide two video files." }, { status: 400 });
  }
  if (topFile.size === 0 || bottomFile.size === 0) {
    return NextResponse.json({ error: "One of the uploaded files is empty." }, { status: 400 });
  }
  if (topFile.size > MAX_UPLOAD_BYTES || bottomFile.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "A file exceeds the maximum upload size." }, { status: 400 });
  }

  const parsed = SplitScreenRequestSchema.safeParse({
    layout: formData?.get("layout"),
    audioSource: formData?.get("audioSource"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { layout, audioSource } = parsed.data;

  const jobDir = await mkdtemp(path.join(tmpdir(), "clippn-split-screen-"));
  try {
    const topPath = path.join(jobDir, `top${path.extname(topFile.name).slice(0, 10) || ".mp4"}`);
    const bottomPath = path.join(jobDir, `bottom${path.extname(bottomFile.name).slice(0, 10) || ".mp4"}`);
    await writeFile(topPath, Buffer.from(await topFile.arrayBuffer()));
    await writeFile(bottomPath, Buffer.from(await bottomFile.arrayBuffer()));

    // Real validation: ffprobe on the actual bytes, not the declared
    // filename/MIME, for both sources.
    await inspectMedia(topPath);
    await inspectMedia(bottomPath);

    const outputPath = path.join(jobDir, "output.mp4");
    await renderSplitScreen({ topPath, bottomPath, outputPath, layout, audioSource });

    const outputBuffer = await readFile(outputPath);
    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${generateDownloadFilename("clippn-split-screen", ".mp4")}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not combine these videos.";
    return NextResponse.json({ error: message }, { status: 422 });
  } finally {
    await rm(jobDir, { recursive: true, force: true });
  }
}
