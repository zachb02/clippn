import { mkdir, writeFile, unlink } from "fs/promises";
import { createReadStream, statSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Clippn has no cloud storage -- uploaded assets and render output live in a
 * local directory next to the project, not in a bucket. STORAGE_DIR lets
 * this be relocated (e.g. to an external drive) without code changes.
 */
const STORAGE_ROOT = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(process.cwd(), "storage");

function assetDir(projectId: string): string {
  return path.join(STORAGE_ROOT, "assets", projectId);
}

/** Stores a buffer under a generated filename -- never the user's original
 * filename, which is kept only as display metadata in the database. */
export async function saveAsset(
  projectId: string,
  buffer: Buffer,
  originalFilename: string
): Promise<{ storagePath: string; absolutePath: string }> {
  const dir = assetDir(projectId);
  await mkdir(dir, { recursive: true });
  const extension = path.extname(originalFilename).slice(0, 10) || ".bin";
  const filename = `${randomUUID()}${extension}`;
  const absolutePath = path.join(dir, filename);
  await writeFile(absolutePath, buffer);
  return { storagePath: path.join("assets", projectId, filename), absolutePath };
}

export function resolveStoragePath(storagePath: string): string {
  // storagePath is always a value this codebase generated (see saveAsset) --
  // never derived from user input -- so a plain join is safe here.
  return path.join(STORAGE_ROOT, storagePath);
}

export async function deleteAsset(storagePath: string): Promise<void> {
  await unlink(resolveStoragePath(storagePath)).catch(() => {});
}

export function statAsset(storagePath: string) {
  return statSync(resolveStoragePath(storagePath));
}

export function readAssetStream(storagePath: string, range?: { start: number; end: number }) {
  return createReadStream(resolveStoragePath(storagePath), range);
}

export function renderOutputDir(): string {
  return path.join(STORAGE_ROOT, "renders");
}
