import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { withTempJobDir, generateDownloadFilename } from "@/lib/media/temp-job";
import { inspectMedia, crop } from "@/lib/media/ffmpeg";
import { CropRequestSchema } from "@/lib/schemas/media-tools";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const parsed = CropRequestSchema.safeParse({
    x: formData?.get("x"),
    y: formData?.get("y"),
    width: formData?.get("width"),
    height: formData?.get("height"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { x, y, width, height } = parsed.data;

  try {
    const outputBuffer = await withTempJobDir(file, ".mp4", async ({ sourcePath, outputPath }) => {
      const metadata = await inspectMedia(sourcePath);
      if (x + width > metadata.width || y + height > metadata.height) {
        throw new Error("Crop region is outside the video's actual dimensions.");
      }

      await crop({ sourcePath, outputPath, x, y, width, height });
      return readFile(outputPath);
    });

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${generateDownloadFilename("clippn-crop", ".mp4")}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not crop this video.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
