"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Sparkle, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Connection {
  id: string;
  label: string;
  provider: string;
}

interface Result {
  projectId: string;
  assetId: string;
  script: string;
  durationSeconds: number;
  mock: boolean;
}

const STAGES = ["Writing a script…", "Generating narration…", "Painting a background…", "Rendering your short…"];

export function IdeaToShortTool() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
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

  async function handleGenerate() {
    if (loading || !connectionId || !topic.trim()) return;
    setLoading(true);
    setResult(null);
    setStageIndex(0);
    stageTimerRef.current = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, 6000);

    try {
      const response = await fetch("/api/idea-to-short", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, topic: topic.trim() }),
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "Could not generate this video.");
        return;
      }
      setResult(body);
      toast.success("Video generated.");
    } catch {
      toast.error("Network error while generating.");
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
          . Idea-to-Short needs text, speech, image, and transcription support, so it only
          works with providers that support all four.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex gap-2">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Describe the idea for your short (e.g. 'why octopuses are geniuses')"
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            disabled={loading}
          />
          <Button onClick={handleGenerate} disabled={loading || !topic.trim() || !connectionId}>
            <Sparkle />
            {loading ? "Generating…" : "Generate"}
          </Button>
        </div>
        {loading && (
          <p className="mt-3 text-sm text-muted-foreground">
            {STAGES[stageIndex]} This can take a minute or two.
          </p>
        )}
      </div>

      {result && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Generated short</h3>
            <div className="flex items-center gap-2">
              {result.mock && <Badge variant="outline">Simulated result (Mock Provider)</Badge>}
              <Link href={`/app/projects/${result.projectId}`} className="text-sm text-primary underline">
                Open project
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="overflow-hidden rounded-lg border border-border/60 sm:w-64 sm:shrink-0">
              <video
                src={`/api/assets/${result.assetId}/file`}
                controls
                className="aspect-9/16 w-full bg-black object-contain"
              />
              <a href={`/api/assets/${result.assetId}/file`} download className="block">
                <Button variant="outline" size="sm" className="w-full rounded-t-none">
                  <DownloadSimple />
                  Download
                </Button>
              </a>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Narration script</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{result.script}</p>
              <p className="mt-3 text-xs text-muted-foreground">{result.durationSeconds.toFixed(0)}s</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
