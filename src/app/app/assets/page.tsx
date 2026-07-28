import Link from "next/link";
import { FilmSlate, MusicNote, Image as ImageIcon, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { Button } from "@/components/ui/button";
import type { UserAssetRow } from "@/app/api/assets/route";

export const dynamic = "force-dynamic";

const KIND_ICON: Record<string, typeof FilmSlate> = {
  video: FilmSlate,
  audio: MusicNote,
  voiceover: MusicNote,
  music: MusicNote,
  image: ImageIcon,
  generated_image: ImageIcon,
};

export default async function AssetsPage() {
  const userId = await getOrCreateLocalUserId();
  const assets = await query<UserAssetRow>(
    `select a.id, a.project_id, p.title as project_title, a.kind, a.original_filename,
            a.mime_type, a.byte_size, a.duration_seconds, a.width, a.height, a.source, a.created_at
     from assets a
     join projects p on p.id = a.project_id
     where a.user_id = $1 and p.user_id = $1 and a.deleted_at is null
     order by a.created_at desc`,
    [userId]
  );

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every uploaded and generated file across all of your projects, in one place.
      </p>

      {assets.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No assets yet. Upload media in a project, or generate clips with{" "}
            <Link href="/app/auto-clip" className="text-primary underline">
              Auto Clip
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => {
            const Icon = KIND_ICON[asset.kind] ?? FilmSlate;
            const isVideo = asset.kind === "video";
            const isAudio = ["audio", "voiceover", "music"].includes(asset.kind);
            return (
              <div key={asset.id} className="overflow-hidden rounded-xl border border-border/60 bg-card">
                {isVideo ? (
                  <video src={`/api/assets/${asset.id}/file`} controls className="aspect-video w-full bg-black object-contain" />
                ) : isAudio ? (
                  <div className="flex items-center justify-center bg-muted/40 p-6">
                    <audio src={`/api/assets/${asset.id}/file`} controls className="w-full" />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted/40">
                    <Icon className="size-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {asset.original_filename ?? `${asset.kind} asset`}
                    </p>
                    <Link
                      href={`/app/projects/${asset.project_id}`}
                      className="mt-0.5 block truncate text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      {asset.project_title}
                    </Link>
                  </div>
                  <a href={`/api/assets/${asset.id}/file`} download className="shrink-0">
                    <Button variant="outline" size="icon-xs">
                      <DownloadSimple />
                    </Button>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
