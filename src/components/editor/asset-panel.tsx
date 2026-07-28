"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CloudArrowUp, FilmSlate, MusicNote } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export interface ProjectAsset {
  id: string;
  kind: string;
  storage_path: string;
  original_filename: string | null;
  duration_seconds: string | null;
  width: number | null;
  height: number | null;
}

export function AssetPanel({
  projectId,
  assets,
  onAssetsChange,
  onAddToVideoTrack,
  onAddToAudioTrack,
}: {
  projectId: string;
  assets: ProjectAsset[];
  onAssetsChange: (assets: ProjectAsset[]) => void;
  onAddToVideoTrack: (asset: ProjectAsset) => void;
  onAddToAudioTrack: (asset: ProjectAsset) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "Could not upload this file.");
        return;
      }
      onAssetsChange([body.asset, ...assets]);
      toast.success("Uploaded.");
    } catch {
      toast.error("Network error while uploading.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex w-64 shrink-0 flex-col border-r border-border/60">
      <div className="border-b border-border/60 p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) handleUpload(selected);
          }}
        />
        <Button
          className="w-full"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <CloudArrowUp />
          {uploading ? "Uploading…" : "Upload media"}
        </Button>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {assets.length === 0 && (
          <p className="text-xs text-muted-foreground">Upload a video or audio file to get started.</p>
        )}
        {assets.map((asset) => (
          <div key={asset.id} className="rounded-lg border border-border/60 bg-card p-2.5">
            <div className="flex items-center gap-2">
              {asset.kind === "video" ? (
                <FilmSlate className="size-4 shrink-0 text-primary" />
              ) : (
                <MusicNote className="size-4 shrink-0 text-primary" />
              )}
              <span className="truncate text-xs font-medium">{asset.original_filename ?? "Untitled"}</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {asset.duration_seconds ? `${Number(asset.duration_seconds).toFixed(1)}s` : ""}
              {asset.width ? ` · ${asset.width}×${asset.height}` : ""}
            </p>
            <div className="mt-2 flex gap-1.5">
              {asset.kind === "video" && (
                <Button size="xs" variant="outline" onClick={() => onAddToVideoTrack(asset)}>
                  + Video track
                </Button>
              )}
              <Button size="xs" variant="outline" onClick={() => onAddToAudioTrack(asset)}>
                + Audio track
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
