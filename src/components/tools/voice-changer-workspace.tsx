"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CloudArrowUp, Download } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

type Preset = "very-deep" | "deep" | "high" | "chipmunk";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "very-deep", label: "Very Deep" },
  { value: "deep", label: "Deep" },
  { value: "high", label: "High" },
  { value: "chipmunk", label: "Chipmunk" },
];

export function VoiceChangerWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>("deep");
  const [processing, setProcessing] = useState(false);

  function handleFileSelect(selected: File) {
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleChange() {
    if (!file) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("preset", preset);
      const response = await fetch("/api/media/voice-changer", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        toast.error(body.error ?? "Could not change this voice.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clippn-voice" + (file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".wav");
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Voice changed and downloaded.");
    } catch {
      toast.error("Network error while changing this voice.");
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
              <p className="mb-1.5 text-sm font-medium">Voice preset</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPreset(p.value)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      preset === p.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleChange} disabled={processing}>
                <Download />
                {processing ? "Changing…" : "Change & download"}
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
          Real pitch-shifting via FFmpeg (asetrate + atempo), running on your own
          machine. No account required.
        </p>
      </div>
    </section>
  );
}
