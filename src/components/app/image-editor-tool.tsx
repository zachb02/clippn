"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkle, UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Connection {
  id: string;
  label: string;
  provider: string;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

export function ImageEditorTool() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imageUrl: string; mock: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Upload a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Image is too large (max 10MB).");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setSourceImage(dataUrl);
      setResult(null);
    } catch {
      toast.error("Could not read that file.");
    }
  }

  async function handleEdit() {
    if (loading || !connectionId || !prompt.trim() || !sourceImage) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/ai-tools/image-editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, prompt: prompt.trim(), sourceImageUrl: sourceImage }),
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "Could not edit the image.");
        return;
      }
      setResult({ imageUrl: body.imageUrl, mock: body.mock });
    } catch {
      toast.error("Network error while editing.");
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
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files?.[0])}
        />
        {sourceImage ? (
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- user-selected local file preview via data URL, not a static import */}
            <img
              src={sourceImage}
              alt="Source"
              className="w-32 rounded-lg border border-border/60 object-cover"
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <UploadSimple />
              Choose a different image
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 py-8 text-sm text-muted-foreground transition-colors hover:border-primary/40"
          >
            <UploadSimple className="size-6" />
            Upload an image to edit (PNG, JPEG, or WebP)
          </button>
        )}

        <div className="mt-4 flex gap-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the edit you want"
            onKeyDown={(e) => e.key === "Enter" && handleEdit()}
          />
          <Button onClick={handleEdit} disabled={loading || !prompt.trim() || !sourceImage}>
            <Sparkle />
            {loading ? "Editing…" : "Edit"}
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
