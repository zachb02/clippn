import { NextResponse } from "next/server";
import { withTempJobDir } from "@/lib/media/temp-job";
import { probeMedia } from "@/lib/media/ffmpeg";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  try {
    const metadata = await withTempJobDir(file, ".bin", async ({ sourcePath }) => probeMedia(sourcePath));
    return NextResponse.json({
      metadata: {
        ...metadata,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type || "unknown",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read this file.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
