"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CloudArrowUp, Download } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export function VideoCompressorWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crf, setCrf] = useState(26);
  const [processing, setProcessing] = useState(false);

  function handleFileSelect(selected: File) {
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleCompress() {
    if (!file) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("crf", String(crf));
      const response = await fetch("/api/media/compress", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        toast.error(body.error ?? "Could not compress this video.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clippn-compressed.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Compressed (before: ${(file.size / 1024 / 1024).toFixed(1)} MB, after: ${(blob.size / 1024 / 1024).toFixed(1)} MB).`);
    } catch {
      toast.error("Network error while compressing.");
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
            <p className="text-sm text-muted-foreground">
              Source: {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Quality</span>
                <span className="text-muted-foreground">
                  {crf <= 22 ? "Higher quality, larger file" : crf >= 30 ? "Smaller file, lower quality" : "Balanced"}
                </span>
              </div>
              <input
                type="range"
                min={18}
                max={35}
                value={crf}
                onChange={(e) => setCrf(Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleCompress} disabled={processing}>
                <Download />
                {processing ? "Compressing…" : "Compress & download"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl(null);
                }}
              >
                Choose a different file
              </Button>
            </div>
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Processing happens on your own machine through FFmpeg. No account required.
        </p>
      </div>
    </section>
  );
}
