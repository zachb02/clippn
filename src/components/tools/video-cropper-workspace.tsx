"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CloudArrowUp, Download } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

interface Metadata {
  durationSeconds: number;
  width: number;
  height: number;
}

const PRESETS: { label: string; ratio: number | null }[] = [
  { label: "9:16", ratio: 9 / 16 },
  { label: "1:1", ratio: 1 },
  { label: "4:5", ratio: 4 / 5 },
  { label: "Original", ratio: null },
];

function centeredCrop(metadata: Metadata, ratio: number | null) {
  if (ratio === null) {
    return { x: 0, y: 0, width: metadata.width, height: metadata.height };
  }
  const sourceRatio = metadata.width / metadata.height;
  if (ratio < sourceRatio) {
    const width = Math.round(metadata.height * ratio);
    return { x: Math.round((metadata.width - width) / 2), y: 0, width, height: metadata.height };
  }
  const height = Math.round(metadata.width / ratio);
  return { x: 0, y: Math.round((metadata.height - height) / 2), width: metadata.width, height };
}

export function VideoCropperWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [preset, setPreset] = useState(PRESETS[0]);
  const [inspecting, setInspecting] = useState(false);
  const [processing, setProcessing] = useState(false);

  async function handleFileSelect(selected: File) {
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setMetadata(null);
    setInspecting(true);
    try {
      const formData = new FormData();
      formData.append("file", selected);
      const response = await fetch("/api/media/inspect", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "Could not read this video.");
        return;
      }
      setMetadata(body.metadata);
    } catch {
      toast.error("Network error while reading the file.");
    } finally {
      setInspecting(false);
    }
  }

  async function handleCrop() {
    if (!file || !metadata) return;
    setProcessing(true);
    try {
      const { x, y, width, height } = centeredCrop(metadata, preset.ratio);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("x", String(x));
      formData.append("y", String(y));
      formData.append("width", String(width));
      formData.append("height", String(height));
      const response = await fetch("/api/media/crop", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        toast.error(body.error ?? "Could not crop this video.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clippn-crop.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Cropped video downloaded.");
    } catch {
      toast.error("Network error while cropping.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-xl border border-border/60 bg-card p-6 sm:p-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) handleFileSelect(selected);
          }}
        />

        {!file ? (
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
              <p className="font-medium">Drop a video file here</p>
              <p className="mt-1 text-sm text-muted-foreground">or choose a file from your device</p>
            </div>
            <Button onClick={() => fileInputRef.current?.click()}>
              <CloudArrowUp />
              Choose a file
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {previewUrl && (
              <video src={previewUrl} controls className="w-full rounded-lg border border-border/60" />
            )}

            {inspecting && <p className="text-sm text-muted-foreground">Reading file…</p>}

            {metadata && (
              <>
                <p className="text-sm text-muted-foreground">
                  Source: {metadata.width}×{metadata.height}
                </p>
                <div>
                  <p className="mb-1.5 text-sm font-medium">Crop to</p>
                  <div className="flex gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => setPreset(p)}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                          preset.label === p.label
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const c = centeredCrop(metadata, preset.ratio);
                    return (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Output: {c.width}×{c.height}, centered
                      </p>
                    );
                  })()}
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleCrop} disabled={processing}>
                    <Download />
                    {processing ? "Cropping…" : "Crop & download"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                      setMetadata(null);
                    }}
                  >
                    Choose a different file
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Processing happens on your own machine through FFmpeg. Nothing is uploaded
          anywhere except to your own local server, and no account is required.
        </p>
      </div>
    </section>
  );
}
