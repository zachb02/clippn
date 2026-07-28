import Link from "next/link";
import { LOCAL_TOOLS } from "@/lib/tools-directory";

const AUDIO_TOOL_SLUGS = ["audio-balancer", "audio-converter", "video-to-audio-converter", "speech-enhancer"];

export default function AudioToolsPage() {
  const audioTools = LOCAL_TOOLS.filter((tool) => tool.slug && AUDIO_TOOL_SLUGS.includes(tool.slug));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Audio Tools</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Local FFmpeg-powered audio tools. No provider connection required.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {audioTools.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/40"
          >
            <tool.icon className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <span className="text-sm font-medium">{tool.label}</span>
              <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
