"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CloudArrowUp, Download } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export function SpeechEnhancerWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [strength, setStrength] = useState(12);
  const [processing, setProcessing] = useState(false);

  function handleFileSelect(selected: File) {
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleEnhance() {
    if (!file) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("strength", String(strength));
      const response = await fetch("/api/media/enhance-speech", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        toast.error(body.error ?? "Could not enhance this audio.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clippn-enhanced" + (file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".wav");
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Enhanced and downloaded.");
    } catch {
      toast.error("Network error while enhancing.");
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
          accept="audio/*,video/*"
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
              <p className="font-medium">Drop an audio or video file here</p>
              <p className="mt-1 text-sm text-muted-foreground">or choose a file from your device</p>
            </div>
            <Button onClick={() => fileInputRef.current?.click()}>
              <CloudArrowUp />
              Choose a file
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {previewUrl && <audio src={previewUrl} controls className="w-full" />}
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Noise reduction strength</span>
                <span className="text-muted-foreground">{strength} dB</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={strength}
                onChange={(e) => setStrength(Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleEnhance} disabled={processing}>
                <Download />
                {processing ? "Enhancing…" : "Enhance & download"}
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
          Real FFT-based noise reduction (FFmpeg&apos;s afftdn) plus a low-frequency
          high-pass filter, running on your own machine. No account required.
        </p>
      </div>
    </section>
  );
}
