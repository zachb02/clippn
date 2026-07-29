import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { withTempJobDir, generateDownloadFilename } from "@/lib/media/temp-job";
import { probeMedia, changeVoice } from "@/lib/media/ffmpeg";
import { VoiceChangerRequestSchema } from "@/lib/schemas/media-tools";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const parsed = VoiceChangerRequestSchema.safeParse({ preset: formData?.get("preset") });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  try {
    const sourceExt = (file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".wav").toLowerCase();
    const outputBuffer = await withTempJobDir(file, sourceExt, async ({ sourcePath, outputPath }) => {
      const metadata = await probeMedia(sourcePath);
      if (!metadata.hasAudio) {
        throw new Error("This file has no audio track to change.");
      }
      await changeVoice({ sourcePath, outputPath, preset: parsed.data.preset });
      return readFile(outputPath);
    });

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${generateDownloadFilename("clippn-voice", sourceExt)}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not change this voice.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
