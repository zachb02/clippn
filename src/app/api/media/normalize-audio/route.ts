import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { withTempJobDir, generateDownloadFilename } from "@/lib/media/temp-job";
import { probeMedia, normalizeAudio } from "@/lib/media/ffmpeg";
import { NormalizeAudioRequestSchema } from "@/lib/schemas/media-tools";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const parsed = NormalizeAudioRequestSchema.safeParse({ targetLufs: formData?.get("targetLufs") });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  try {
    const sourceExt = (file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".wav").toLowerCase();
    const outputBuffer = await withTempJobDir(file, sourceExt, async ({ sourcePath, outputPath }) => {
      const metadata = await probeMedia(sourcePath);
      if (!metadata.hasAudio) {
        throw new Error("This file has no audio track to normalize.");
      }
      await normalizeAudio({ sourcePath, outputPath, targetLufs: parsed.data.targetLufs });
      return readFile(outputPath);
    });

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${generateDownloadFilename("clippn-normalized", sourceExt)}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not normalize this audio.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
