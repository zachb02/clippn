"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CloudArrowUp, Download } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Metadata {
  durationSeconds: number;
  width: number;
  height: number;
}

export function VideoCutterWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [startSeconds, setStartSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(5);
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
      setDurationSeconds(Math.min(5, body.metadata.durationSeconds));
    } catch {
      toast.error("Network error while reading the file.");
    } finally {
      setInspecting(false);
    }
  }

  async function handleTrim() {
    if (!file) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("startSeconds", String(startSeconds));
      formData.append("durationSeconds", String(durationSeconds));
      const response = await fetch("/api/media/trim", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        toast.error(body.error ?? "Could not trim this video.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clippn-trim.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Trimmed video downloaded.");
    } catch {
      toast.error("Network error while trimming.");
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
                  {metadata.width}×{metadata.height}, {metadata.durationSeconds.toFixed(1)}s
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="start">Start (seconds)</Label>
                    <Input
                      id="start"
                      type="number"
                      min={0}
                      max={metadata.durationSeconds}
                      step={0.1}
                      value={startSeconds}
                      onChange={(e) => setStartSeconds(Number(e.target.value))}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (seconds)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={0.1}
                      max={metadata.durationSeconds}
                      step={0.1}
                      value={durationSeconds}
                      onChange={(e) => setDurationSeconds(Number(e.target.value))}
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleTrim} disabled={processing}>
                    <Download />
                    {processing ? "Trimming…" : "Trim & download"}
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
