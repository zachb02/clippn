"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Connection {
  id: string;
  label: string;
  provider: string;
}

export function ImageGeneratorTool() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imageUrl: string; mock: boolean } | null>(null);

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
  }, []);

  async function handleGenerate() {
    if (loading || !connectionId || !prompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/ai-tools/image-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, prompt: prompt.trim() }),
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "Could not generate an image.");
        return;
      }
      setResult({ imageUrl: body.imageUrl, mock: body.mock });
    } catch {
      toast.error("Network error while generating.");
    } finally {
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
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex gap-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want"
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
          <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
            <Sparkle />
            {loading ? "Generating…" : "Generate"}
          </Button>
        </div>
      </div>

      {result && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold">Result</h3>
            {result.mock && <Badge variant="outline">Simulated result (Mock Provider)</Badge>}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- provider-returned URL, not a static import Next can optimize */}
          <img src={result.imageUrl} alt={prompt} className="w-full max-w-xs rounded-lg border border-border/60" />
        </div>
      )}
    </div>
  );
}
