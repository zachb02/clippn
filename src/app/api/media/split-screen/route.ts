import { NextResponse } from "next/server";
import { mkdtemp, rm, writeFile, readFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { inspectMedia, renderSplitScreen } from "@/lib/media/ffmpeg";
import { generateDownloadFilename } from "@/lib/media/temp-job";
import { SplitScreenRequestSchema } from "@/lib/schemas/media-tools";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
// Same reasoning as Auto Clip / Idea-to-Short / Reddit Story: a local
// single-user app with no distributed rate limiter, but nothing should
// let several concurrent encodes pile up unbounded on the user's machine.
const MAX_CONCURRENT_JOBS = 2;
let activeJobs = 0;

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

  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    return NextResponse.json(
      { error: "Too many combine jobs are already running. Wait for one to finish and try again." },
      { status: 429 }
    );
  }
  activeJobs++;

  let jobDir: string | null = null;
  try {
    jobDir = await mkdtemp(path.join(tmpdir(), "clippn-split-screen-"));
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
    activeJobs--;
    // A cleanup failure here must never override an already-returned
    // response -- finally's own throw would replace a successful download
    // with an unhandled 500.
    if (jobDir) {
      await rm(jobDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
