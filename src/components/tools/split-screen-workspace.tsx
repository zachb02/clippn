"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CloudArrowUp, Download } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

type Layout = "vertical" | "horizontal";
type AudioSource = "top" | "bottom";

function SlotUpload({
  label,
  file,
  onSelect,
}: {
  label: string;
  file: File | null;
  onSelect: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) onSelect(selected);
        }}
      />
      {file ? (
        <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
          <span className="truncate text-sm">{file.name}</span>
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            Change
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 py-8 text-sm text-muted-foreground transition-colors hover:border-primary/40"
        >
          <CloudArrowUp className="size-5" />
          {label}
        </button>
      )}
    </div>
  );
}

export function SplitScreenWorkspace() {
  const [topFile, setTopFile] = useState<File | null>(null);
  const [bottomFile, setBottomFile] = useState<File | null>(null);
  const [layout, setLayout] = useState<Layout>("vertical");
  const [audioSource, setAudioSource] = useState<AudioSource>("top");
  const [processing, setProcessing] = useState(false);

  async function handleCombine() {
    if (!topFile || !bottomFile || processing) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("topFile", topFile);
      formData.append("bottomFile", bottomFile);
      formData.append("layout", layout);
      formData.append("audioSource", audioSource);
      const response = await fetch("/api/media/split-screen", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        toast.error(body.error ?? "Could not combine these videos.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clippn-split-screen.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Split-screen video downloaded.");
    } catch {
      toast.error("Network error while combining.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-xl border border-border/60 bg-card p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <SlotUpload label={layout === "vertical" ? "Top video" : "Left video"} file={topFile} onSelect={setTopFile} />
          <SlotUpload
            label={layout === "vertical" ? "Bottom video" : "Right video"}
            file={bottomFile}
            onSelect={setBottomFile}
          />
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm font-medium">Layout</p>
            <div className="flex gap-2">
              {(["vertical", "horizontal"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLayout(l)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    layout === l
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l === "vertical" ? "Top / bottom" : "Side by side"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Audio from</p>
            <div className="flex gap-2">
              {(["top", "bottom"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAudioSource(a)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    audioSource === a
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {layout === "vertical" ? (a === "top" ? "Top video" : "Bottom video") : a === "top" ? "Left video" : "Right video"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={handleCombine} disabled={!topFile || !bottomFile || processing}>
            <Download />
            {processing ? "Combining…" : "Combine & download"}
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Processing happens on your own machine through FFmpeg. Nothing is uploaded
          anywhere except to your own local server, and no account is required.
        </p>
      </div>
    </section>
  );
}
