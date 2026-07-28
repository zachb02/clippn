import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2GB, matches README's documented default

/**
 * Runs `work` inside a fresh, per-job temp directory that is always removed
 * afterward, success or failure. The uploaded file is written under a
 * generated name -- the original filename is never used as an on-disk path
 * component (see docs/architecture/07-media-processing-architecture.md).
 */
export async function withTempJobDir<T>(
  uploadedFile: File,
  outputExtension: string,
  work: (paths: { sourcePath: string; outputPath: string }) => Promise<T>
): Promise<T> {
  if (uploadedFile.size === 0) {
    throw new Error("Uploaded file is empty.");
  }
  if (uploadedFile.size > MAX_UPLOAD_BYTES) {
    throw new Error("File exceeds the maximum upload size.");
  }

  const jobDir = await mkdtemp(path.join(tmpdir(), "clippn-media-"));
  try {
    const sourceExtension = path.extname(uploadedFile.name).slice(0, 10) || ".bin";
    const sourcePath = path.join(jobDir, `source${sourceExtension}`);
    const outputPath = path.join(jobDir, `output${outputExtension}`);

    const buffer = Buffer.from(await uploadedFile.arrayBuffer());
    await writeFile(sourcePath, buffer);

    return await work({ sourcePath, outputPath });
  } finally {
    await rm(jobDir, { recursive: true, force: true });
  }
}

export function generateDownloadFilename(prefix: string, extension: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}${extension}`;
}
