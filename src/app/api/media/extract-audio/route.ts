import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { withTempJobDir, generateDownloadFilename } from "@/lib/media/temp-job";
import { probeMedia, extractAudio } from "@/lib/media/ffmpeg";
import { ExtractAudioRequestSchema } from "@/lib/schemas/media-tools";

const CONTENT_TYPE: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac" };

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const parsed = ExtractAudioRequestSchema.safeParse({ format: formData?.get("format") });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { format } = parsed.data;

  try {
    const outputBuffer = await withTempJobDir(file, `.${format}`, async ({ sourcePath, outputPath }) => {
      const metadata = await probeMedia(sourcePath);
      if (!metadata.hasAudio) {
        throw new Error("This file has no audio track to extract.");
      }
      await extractAudio({ sourcePath, outputPath, format });
      return readFile(outputPath);
    });

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPE[format],
        "Content-Disposition": `attachment; filename="${generateDownloadFilename("clippn-audio", `.${format}`)}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not extract audio from this file.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
