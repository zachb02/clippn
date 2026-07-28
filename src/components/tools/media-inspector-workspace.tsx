"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CloudArrowUp } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

interface Metadata {
  durationSeconds: number;
  width: number;
  height: number;
  hasVideo: boolean;
  hasAudio: boolean;
  formatName: string;
  bitRate: number | null;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaInspectorWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [inspecting, setInspecting] = useState(false);

  async function handleFileSelect(selected: File) {
    setInspecting(true);
    setMetadata(null);
    try {
      const formData = new FormData();
      formData.append("file", selected);
      const response = await fetch("/api/media/probe", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "Could not read this file.");
        return;
      }
      setMetadata(body.metadata);
    } catch {
      toast.error("Network error while reading the file.");
    } finally {
      setInspecting(false);
    }
  }

  const rows: { label: string; value: string }[] = metadata
    ? [
        { label: "File name", value: metadata.fileName },
        { label: "File size", value: formatBytes(metadata.fileSizeBytes) },
        { label: "MIME type", value: metadata.mimeType },
        { label: "Container", value: metadata.formatName },
        { label: "Duration", value: `${metadata.durationSeconds.toFixed(2)}s` },
        ...(metadata.hasVideo ? [{ label: "Resolution", value: `${metadata.width}×${metadata.height}` }] : []),
        { label: "Has video stream", value: metadata.hasVideo ? "Yes" : "No" },
        { label: "Has audio stream", value: metadata.hasAudio ? "Yes" : "No" },
        ...(metadata.bitRate ? [{ label: "Bit rate", value: `${Math.round(metadata.bitRate / 1000)} kb/s` }] : []),
      ]
    : [];

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-xl border border-border/60 bg-card p-6 sm:p-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) handleFileSelect(selected);
          }}
        />

        {!metadata && !inspecting ? (
          <div
            className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border/60 bg-card/40 p-12 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = e.dataTransfer.files[0];
              if (dropped) handleFileSelect(dropped);
            }}
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
              <CloudArrowUp className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Drop a video or audio file here</p>
              <p className="mt-1 text-sm text-muted-foreground">or choose a file from your device</p>
            </div>
            <Button onClick={() => fileInputRef.current?.click()}>
              <CloudArrowUp />
              Choose a file
            </Button>
          </div>
        ) : inspecting ? (
          <p className="text-sm text-muted-foreground">Reading file…</p>
        ) : (
          <div>
            <dl className="divide-y divide-border/60 rounded-lg border border-border/60">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="font-mono">{row.value}</dd>
                </div>
              ))}
            </dl>
            <Button variant="ghost" className="mt-4" onClick={() => setMetadata(null)}>
              Inspect a different file
            </Button>
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Reads metadata via FFprobe on your own machine. Nothing is uploaded anywhere else.
        </p>
      </div>
    </section>
  );
}
