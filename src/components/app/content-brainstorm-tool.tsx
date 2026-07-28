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

export function ContentBrainstormTool() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; mock: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/providers/connections")
      .then((r) => r.json())
      .then((body) => {
        setConnections(body.connections ?? []);
        if (body.connections?.[0]) setConnectionId(body.connections[0].id);
      });
  }, []);

  async function handleGenerate() {
    if (!connectionId || !topic.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/ai-tools/content-brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, topic: topic.trim() }),
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "Could not generate ideas.");
        return;
      }
      setResult({ text: body.text, mock: body.mock });
    } catch {
      toast.error("Network error while generating.");
    } finally {
      setLoading(false);
    }
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
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What's your video about?"
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
          <Button onClick={handleGenerate} disabled={loading || !topic.trim()}>
            <Sparkle />
            {loading ? "Thinking…" : "Generate"}
          </Button>
        </div>
        {connections.length > 1 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Using connection: {connections.find((c) => c.id === connectionId)?.label}
          </p>
        )}
      </div>

      {result && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold">Ideas</h3>
            {result.mock && <Badge variant="outline">Simulated result (Mock Provider)</Badge>}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{result.text}</p>
        </div>
      )}
    </div>
  );
}
