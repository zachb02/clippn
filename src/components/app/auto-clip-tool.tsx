"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Scissors, UploadSimple, DownloadSimple, LinkSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { YOUTUBE_RIGHTS_STATEMENT } from "@/lib/media/youtube-rights";

interface Connection {
  id: string;
  label: string;
  provider: string;
}

interface GeneratedClip {
  assetId: string;
  title: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
}

const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"];
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

const UPLOAD_STAGES = ["Uploading video…", "Transcribing speech…", "Finding the best moments…", "Rendering vertical clips…"];
const YOUTUBE_STAGES = ["Downloading from YouTube…", "Transcribing speech…", "Finding the best moments…", "Rendering vertical clips…"];

function isPlausibleYoutubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function AutoClipTool() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [mode, setMode] = useState<"upload" | "youtube">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState<{ projectId: string; clips: GeneratedClip[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/providers/connections")
      .then((r) => r.json())
      .then((body) => {
        setConnections(body.connections ?? []);
        if (body.connections?.[0]) setConnectionId(body.connections[0].id);
      })
      .catch(() => {
        toast.error("Could not load your provider connections.");
      })
      .finally(() => setLoadingConnections(false));

    return () => {
      if (stageTimerRef.current) clearInterval(stageTimerRef.current);
    };
  }, []);

  function handleFileSelected(selected: File | undefined) {
    if (!selected) return;
    if (!ACCEPTED_TYPES.some((t) => selected.type === t) && !selected.name.match(/\.(mp4|mov|webm|mkv)$/i)) {
      toast.error("Upload an MP4, MOV, WebM, or MKV video.");
      return;
    }
    if (selected.size > MAX_UPLOAD_BYTES) {
      toast.error("Video is too large (max 2GB).");
      return;
    }
    setFile(selected);
    setResult(null);
  }

  const canGenerate =
    !loading &&
    !!connectionId &&
    (mode === "upload" ? !!file : isPlausibleYoutubeUrl(youtubeUrl) && rightsConfirmed);

  async function handleGenerate() {
    if (!canGenerate || !connectionId) return;
    setLoading(true);
    setResult(null);
    setStageIndex(0);
    const stages = mode === "upload" ? UPLOAD_STAGES : YOUTUBE_STAGES;
    // There's no real progress channel from the backend yet -- this cycles
    // through the pipeline's known stages on a timer purely so the UI
    // doesn't look frozen during what can be a multi-minute job. It's a
    // stage indicator, not a measured progress bar.
    stageTimerRef.current = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, stages.length - 1));
    }, 8000);

    try {
      const formData = new FormData();
      formData.append("connectionId", connectionId);
      if (mode === "upload" && file) {
        formData.append("file", file);
      } else {
        formData.append("youtubeUrl", youtubeUrl.trim());
        formData.append("rightsConfirmed", String(rightsConfirmed));
      }
      const response = await fetch("/api/auto-clip", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "Could not generate clips from this video.");
        return;
      }
      setResult({ projectId: body.projectId, clips: body.clips });
      toast.success(`Generated ${body.clips.length} clip${body.clips.length === 1 ? "" : "s"}.`);
    } catch {
      toast.error("Network error while generating clips.");
    } finally {
      if (stageTimerRef.current) clearInterval(stageTimerRef.current);
      setLoading(false);
    }
  }

  if (loadingConnections) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
        <p className="text-sm text-muted-foreground">Loading your provider connections…</p>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Connect a provider first (Mock Provider works great for testing) in{" "}
          <a href="/app/settings/providers" className="text-primary underline">
            Settings
          </a>
          . Auto Clip needs transcription and text generation, so it only works with
          providers that support both.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "upload" | "youtube")}>
          <TabsList>
            <TabsTrigger value="upload" disabled={loading}>
              Upload a file
            </TabsTrigger>
            <TabsTrigger value="youtube" disabled={loading}>
              YouTube link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0])}
            />
            {file ? (
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
                <span className="truncate text-sm">{file.name}</span>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                  Choose a different video
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 py-10 text-sm text-muted-foreground transition-colors hover:border-primary/40"
              >
                <UploadSimple className="size-6" />
                Upload a long-form video (MP4, MOV, WebM, or MKV)
              </button>
            )}
          </TabsContent>

          <TabsContent value="youtube" className="mt-4 space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 px-3">
              <LinkSimple className="size-4 shrink-0 text-muted-foreground" />
              <Input
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  setResult(null);
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={loading}
                className="border-0 px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(e) => setRightsConfirmed(e.target.checked)}
                disabled={loading}
                className="mt-0.5 size-4 shrink-0"
              />
              {YOUTUBE_RIGHTS_STATEMENT}
            </label>
          </TabsContent>
        </Tabs>

        <div className="mt-4 flex items-center gap-3">
          <Select value={connectionId ?? undefined} onValueChange={setConnectionId} disabled={loading}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choose a connection">
                {(value: string | null) => {
                  const match = connections.find((c) => c.id === value);
                  return match ? `${match.label} (${match.provider})` : "Choose a connection";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {connections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label} ({c.provider})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={!canGenerate}>
            <Scissors />
            {loading ? "Generating…" : "Generate Clips"}
          </Button>
        </div>

        {loading && (
          <p className="mt-3 text-sm text-muted-foreground">
            {(mode === "upload" ? UPLOAD_STAGES : YOUTUBE_STAGES)[stageIndex]} This can take a few minutes for
            longer videos.
          </p>
        )}
      </div>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {result.clips.length} clip{result.clips.length === 1 ? "" : "s"} generated
            </h3>
            <Link href={`/app/projects/${result.projectId}`} className="text-sm text-primary underline">
              Open project
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.clips.map((clip) => (
              <div key={clip.assetId} className="overflow-hidden rounded-xl border border-border/60 bg-card">
                <video
                  src={`/api/assets/${clip.assetId}/file`}
                  controls
                  className="aspect-9/16 w-full bg-black object-contain"
                />
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{clip.title}</p>
                    <p className="text-xs text-muted-foreground">{clip.durationSeconds.toFixed(0)}s</p>
                  </div>
                  <a href={`/api/assets/${clip.assetId}/file`} download className="shrink-0">
                    <Button variant="outline" size="icon-xs">
                      <DownloadSimple />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
