"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Play,
  Pause,
  Trash,
  CaretUp,
  CaretDown,
  TextT,
  Export,
  Sparkle,
  MicrophoneStage,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AssetPanel, type ProjectAsset } from "./asset-panel";
import type { TimelineSpecT, TimelineClipT } from "@/lib/timeline/schema";
import { emptyTimeline } from "@/lib/timeline/schema";
import { sequenceClips, findActiveClip, timelineDuration } from "@/lib/timeline/playback";

export function EditorShell({
  projectId,
  initialTimeline,
  initialAssets,
}: {
  projectId: string;
  initialTimeline: TimelineSpecT | null;
  initialAssets: ProjectAsset[];
}) {
  const [timeline, setTimeline] = useState<TimelineSpecT>(initialTimeline ?? emptyTimeline());
  const [assets, setAssets] = useState<ProjectAsset[]>(initialAssets);
  const [playheadSeconds, setPlayheadSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [captioning, setCaptioning] = useState(false);
  const [newCaptionText, setNewCaptionText] = useState("");
  const [voiceoverScript, setVoiceoverScript] = useState("");
  const [generatingVoiceover, setGeneratingVoiceover] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeVideoAssetIdRef = useRef<string | null>(null);

  const videoTrack = timeline.tracks.find((t) => t.kind === "video")!;
  const audioTrack = timeline.tracks.find((t) => t.kind === "audio")!;
  const textTrack = timeline.tracks.find((t) => t.kind === "text")!;

  const sequencedVideo = sequenceClips(timeline.clips, videoTrack.id);
  const sequencedAudio = sequenceClips(timeline.clips, audioTrack.id);
  const textClips = timeline.clips.filter((c) => c.trackId === textTrack.id);
  const totalDuration = timelineDuration(timeline);

  const saveTimeline = useCallback(
    async (next: TimelineSpecT) => {
      await fetch(`/api/projects/${projectId}/timeline`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    },
    [projectId]
  );

  function updateTimeline(updater: (current: TimelineSpecT) => TimelineSpecT) {
    setTimeline((current) => {
      const next = updater(current);
      saveTimeline(next);
      return next;
    });
  }

  function addClipToTrack(asset: ProjectAsset, trackId: string) {
    const clipsOnTrack = timeline.clips.filter((c) => c.trackId === trackId);
    const newClip: TimelineClipT = {
      id: crypto.randomUUID(),
      trackId,
      assetId: asset.id,
      startSeconds: clipsOnTrack.length,
      durationSeconds: Number(asset.duration_seconds) || 1,
      trimInSeconds: 0,
      textContent: null,
    };
    updateTimeline((current) => ({ ...current, clips: [...current.clips, newClip] }));
  }

  function addCaption() {
    if (!newCaptionText.trim()) return;
    const newClip: TimelineClipT = {
      id: crypto.randomUUID(),
      trackId: textTrack.id,
      assetId: null,
      startSeconds: playheadSeconds,
      durationSeconds: 3,
      trimInSeconds: 0,
      textContent: { text: newCaptionText.trim(), fontSizePx: 48, color: "#ffffff" },
    };
    updateTimeline((current) => ({ ...current, clips: [...current.clips, newClip] }));
    setNewCaptionText("");
  }

  function deleteClip(clipId: string) {
    updateTimeline((current) => ({ ...current, clips: current.clips.filter((c) => c.id !== clipId) }));
  }

  function moveClip(trackId: string, clipId: string, direction: -1 | 1) {
    const onTrack = timeline.clips
      .filter((c) => c.trackId === trackId)
      .sort((a, b) => a.startSeconds - b.startSeconds);
    const index = onTrack.findIndex((c) => c.id === clipId);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= onTrack.length) return;
    const a = onTrack[index];
    const b = onTrack[swapIndex];
    updateTimeline((current) => ({
      ...current,
      clips: current.clips.map((c) => {
        if (c.id === a.id) return { ...c, startSeconds: b.startSeconds };
        if (c.id === b.id) return { ...c, startSeconds: a.startSeconds };
        return c;
      }),
    }));
  }

  function updateClipField(clipId: string, patch: Partial<TimelineClipT>) {
    updateTimeline((current) => ({
      ...current,
      clips: current.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
    }));
  }

  // Swap the preview <video> source whenever the playhead crosses into a
  // different clip's window (or the sequence itself changes -- e.g. a clip
  // was just added), and seek to the right offset within it.
  const sequenceSignature = sequencedVideo
    .map((s) => `${s.clip.id}:${s.clip.assetId}:${s.clip.durationSeconds}:${s.clip.trimInSeconds}`)
    .join("|");
  useEffect(() => {
    const active = findActiveClip(sequencedVideo, playheadSeconds);
    const video = videoRef.current;
    if (!video || !active?.clip.assetId) return;

    const offsetInClip = playheadSeconds - active.playbackStart + active.clip.trimInSeconds;
    if (activeVideoAssetIdRef.current !== active.clip.assetId) {
      activeVideoAssetIdRef.current = active.clip.assetId;
      video.src = `/api/assets/${active.clip.assetId}/file`;
      video.currentTime = offsetInClip;
      if (playing) video.play().catch(() => {});
    } else if (Math.abs(video.currentTime - offsetInClip) > 0.5) {
      video.currentTime = offsetInClip;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playheadSeconds < 0.001 ? 0 : Math.floor(playheadSeconds), sequenceSignature]);

  useEffect(() => {
    if (!playing) return;
    let raf: number;
    const tick = () => {
      setPlayheadSeconds((t) => {
        const next = t + 1 / 30;
        if (next >= totalDuration) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, totalDuration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) video.play().catch(() => {});
    else video.pause();
  }, [playing]);

  async function handleExport() {
    setExporting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/render`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        toast.error(body.error ?? "Could not render this project.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "export.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Rendered and downloaded.");
    } catch {
      toast.error("Network error while rendering.");
    } finally {
      setExporting(false);
    }
  }

  async function handleAutoCaption() {
    const firstVideoClip = sequencedVideo[0]?.clip;
    if (!firstVideoClip?.assetId) {
      toast.error("Add a clip to the video track first.");
      return;
    }
    setCaptioning(true);
    try {
      const connectionsResponse = await fetch("/api/providers/connections");
      const connectionsBody = await connectionsResponse.json();
      const connection = connectionsBody.connections?.[0];
      if (!connection) {
        toast.error("Connect a provider first (Mock Provider works great for testing) in Settings.");
        return;
      }

      const response = await fetch(`/api/projects/${projectId}/quick-subtitles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: connection.id, assetId: firstVideoClip.assetId }),
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "Could not generate captions.");
        return;
      }

      const newClips: TimelineClipT[] = body.captions.map(
        (caption: { startSeconds: number; durationSeconds: number; text: string }) => ({
          id: crypto.randomUUID(),
          trackId: textTrack.id,
          assetId: null,
          startSeconds: caption.startSeconds,
          durationSeconds: caption.durationSeconds,
          trimInSeconds: 0,
          textContent: { text: caption.text, fontSizePx: 48, color: "#ffffff" },
        })
      );
      updateTimeline((current) => ({ ...current, clips: [...current.clips, ...newClips] }));
      toast.success(
        body.mock
          ? `Added ${newClips.length} simulated captions (Mock Provider).`
          : `Added ${newClips.length} captions.`
      );
    } catch {
      toast.error("Network error while generating captions.");
    } finally {
      setCaptioning(false);
    }
  }

  async function handleGenerateVoiceover() {
    if (!voiceoverScript.trim()) return;
    setGeneratingVoiceover(true);
    try {
      const connectionsResponse = await fetch("/api/providers/connections");
      const connectionsBody = await connectionsResponse.json();
      const connection = connectionsBody.connections?.[0];
      if (!connection) {
        toast.error("Connect a provider first (Mock Provider works great for testing) in Settings.");
        return;
      }

      const response = await fetch(`/api/projects/${projectId}/voiceover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: connection.id, script: voiceoverScript.trim() }),
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "Could not generate a voiceover.");
        return;
      }

      const newAsset: ProjectAsset = {
        id: body.asset.id,
        kind: body.asset.kind,
        storage_path: body.asset.storage_path,
        original_filename: body.asset.original_filename,
        duration_seconds: body.asset.duration_seconds,
        width: null,
        height: null,
      };
      setAssets((current) => [newAsset, ...current]);
      addClipToTrack(newAsset, audioTrack.id);
      setVoiceoverScript("");
      toast.success(body.mock ? "Voiceover added (simulated, Mock Provider)." : "Voiceover added.");
    } catch {
      toast.error("Network error while generating the voiceover.");
    } finally {
      setGeneratingVoiceover(false);
    }
  }

  const activeCaption = textClips.find(
    (c) => playheadSeconds >= c.startSeconds && playheadSeconds < c.startSeconds + c.durationSeconds
  );

  return (
    <div className="-m-6 flex h-[calc(100vh-1px)] flex-col">
      <div className="flex flex-1 overflow-hidden">
        <AssetPanel
          projectId={projectId}
          assets={assets}
          onAssetsChange={setAssets}
          onAddToVideoTrack={(asset) => addClipToTrack(asset, videoTrack.id)}
          onAddToAudioTrack={(asset) => addClipToTrack(asset, audioTrack.id)}
        />

        <div className="flex flex-1 flex-col items-center justify-center bg-black/40 p-6">
          <div
            className="relative aspect-[9/16] max-h-full overflow-hidden rounded-lg border border-border/60 bg-black"
            style={{ containerType: "inline-size" }}
          >
            {sequencedVideo.length > 0 ? (
              <video ref={videoRef} className="h-full w-full object-contain" muted={false} playsInline />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                Add a clip to the video track to preview it here
              </div>
            )}
            {activeCaption?.textContent && (
              <div className="absolute inset-x-4 bottom-[5%] text-center">
                <span
                  className="inline-block rounded px-2 py-1 font-bold"
                  style={{
                    color: activeCaption.textContent.color,
                    // Scaled against the preview box's own rendered width
                    // (via container query units), so it matches the
                    // proportions of the exported render regardless of
                    // viewport size -- font size is defined relative to the
                    // 1080px canvas width in the render pipeline.
                    fontSize: `${(activeCaption.textContent.fontSizePx / timeline.canvasWidth) * 100}cqw`,
                    textShadow: "0 0 4px black, 0 0 4px black",
                  }}
                >
                  {activeCaption.textContent.text}
                </span>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Audio-track music plays in the exported file, not this live preview.
          </p>
        </div>

        <div className="w-72 shrink-0 space-y-3 border-l border-border/60 p-3">
          <Button className="w-full" onClick={handleExport} disabled={exporting || sequencedVideo.length === 0}>
            <Export />
            {exporting ? "Rendering…" : "Export"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleAutoCaption}
            disabled={captioning || sequencedVideo.length === 0}
          >
            <Sparkle />
            {captioning ? "Captioning…" : "Auto-caption"}
          </Button>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Add caption at playhead</p>
            <div className="mt-1.5 flex gap-1.5">
              <Input
                value={newCaptionText}
                onChange={(e) => setNewCaptionText(e.target.value)}
                placeholder="Caption text"
                className="h-8 text-sm"
              />
              <Button size="sm" onClick={addCaption} disabled={!newCaptionText.trim()}>
                <TextT />
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Generate voiceover</p>
            <Textarea
              value={voiceoverScript}
              onChange={(e) => setVoiceoverScript(e.target.value)}
              placeholder="Script to narrate…"
              className="mt-1.5 min-h-16 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-1.5 w-full"
              onClick={handleGenerateVoiceover}
              disabled={generatingVoiceover || !voiceoverScript.trim()}
            >
              <MicrophoneStage />
              {generatingVoiceover ? "Generating…" : "Add to audio track"}
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 p-4">
        <div className="mb-3 flex items-center gap-3">
          <Button size="icon-sm" variant="outline" onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <input
            type="range"
            min={0}
            max={Math.max(totalDuration, 0.1)}
            step={0.1}
            value={playheadSeconds}
            onChange={(e) => setPlayheadSeconds(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="w-20 text-right font-mono text-xs text-muted-foreground">
            {playheadSeconds.toFixed(1)}s / {totalDuration.toFixed(1)}s
          </span>
        </div>

        <TrackRow
          label="Video"
          sequenced={sequencedVideo}
          onDelete={deleteClip}
          onMove={(clipId, dir) => moveClip(videoTrack.id, clipId, dir)}
          onTrimChange={updateClipField}
        />
        <TrackRow
          label="Audio"
          sequenced={sequencedAudio}
          onDelete={deleteClip}
          onMove={(clipId, dir) => moveClip(audioTrack.id, clipId, dir)}
          onTrimChange={updateClipField}
        />
        <div className="mt-2 flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Text</span>
          <div className="flex flex-1 flex-wrap gap-2">
            {textClips.map((clip) => (
              <div
                key={clip.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs"
              >
                <span className="max-w-[12ch] truncate">{clip.textContent?.text}</span>
                <span className="text-muted-foreground">
                  {clip.startSeconds.toFixed(1)}s–{(clip.startSeconds + clip.durationSeconds).toFixed(1)}s
                </span>
                <button onClick={() => deleteClip(clip.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash className="size-3.5" />
                </button>
              </div>
            ))}
            {textClips.length === 0 && (
              <span className="text-xs text-muted-foreground">No captions yet</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackRow({
  label,
  sequenced,
  onDelete,
  onMove,
  onTrimChange,
}: {
  label: string;
  sequenced: { clip: TimelineClipT; playbackStart: number; playbackEnd: number }[];
  onDelete: (clipId: string) => void;
  onMove: (clipId: string, direction: -1 | 1) => void;
  onTrimChange: (clipId: string, patch: Partial<TimelineClipT>) => void;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-1 gap-2 overflow-x-auto">
        {sequenced.map(({ clip, playbackStart, playbackEnd }) => (
          <div
            key={clip.id}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs"
          >
            <div className="flex flex-col">
              <button onClick={() => onMove(clip.id, -1)} className="text-muted-foreground hover:text-foreground">
                <CaretUp className="size-3" />
              </button>
              <button onClick={() => onMove(clip.id, 1)} className="text-muted-foreground hover:text-foreground">
                <CaretDown className="size-3" />
              </button>
            </div>
            <span className="text-muted-foreground">
              {playbackStart.toFixed(1)}–{playbackEnd.toFixed(1)}s
            </span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={clip.durationSeconds}
              onChange={(e) => onTrimChange(clip.id, { durationSeconds: Number(e.target.value) })}
              className="w-14 rounded border border-border/60 bg-transparent px-1 py-0.5"
              title="Duration (seconds)"
            />
            <button onClick={() => onDelete(clip.id)} className="text-muted-foreground hover:text-destructive">
              <Trash className="size-3.5" />
            </button>
          </div>
        ))}
        {sequenced.length === 0 && <span className="text-xs text-muted-foreground">No clips yet</span>}
      </div>
    </div>
  );
}
