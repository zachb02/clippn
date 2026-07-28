import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { withTempJobDir, generateDownloadFilename } from "@/lib/media/temp-job";
import { probeMedia, compress } from "@/lib/media/ffmpeg";
import { CompressRequestSchema } from "@/lib/schemas/media-tools";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const parsed = CompressRequestSchema.safeParse({ crf: formData?.get("crf") });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  try {
    const outputBuffer = await withTempJobDir(file, ".mp4", async ({ sourcePath, outputPath }) => {
      const metadata = await probeMedia(sourcePath);
      if (!metadata.hasVideo) {
        throw new Error("This file has no video stream to compress.");
      }
      await compress({ sourcePath, outputPath, crf: parsed.data.crf });
      return readFile(outputPath);
    });

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${generateDownloadFilename("clippn-compressed", ".mp4")}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not compress this video.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
