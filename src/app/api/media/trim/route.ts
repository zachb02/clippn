import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { withTempJobDir, generateDownloadFilename } from "@/lib/media/temp-job";
import { inspectMedia, trim } from "@/lib/media/ffmpeg";
import { TrimRequestSchema } from "@/lib/schemas/media-tools";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const parsed = TrimRequestSchema.safeParse({
    startSeconds: formData?.get("startSeconds"),
    durationSeconds: formData?.get("durationSeconds"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { startSeconds, durationSeconds } = parsed.data;

  try {
    const outputBuffer = await withTempJobDir(file, ".mp4", async ({ sourcePath, outputPath }) => {
      const metadata = await inspectMedia(sourcePath);
      if (startSeconds >= metadata.durationSeconds) {
        throw new Error("Start point is at or past the end of the video.");
      }
      const clampedDuration = Math.min(durationSeconds, metadata.durationSeconds - startSeconds);

      await trim({ sourcePath, outputPath, startSeconds, durationSeconds: clampedDuration });
      // Read the result before the temp dir is cleaned up in withTempJobDir's finally.
      return readFile(outputPath);
    });

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${generateDownloadFilename("clippn-trim", ".mp4")}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not trim this video.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
