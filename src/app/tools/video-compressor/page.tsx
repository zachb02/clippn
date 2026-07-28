import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { VideoCompressorWorkspace } from "@/components/tools/video-compressor-workspace";

export const metadata: Metadata = {
  title: "Video Compressor — Clippn",
  description: "Reduce file size for faster uploads and sharing. Runs locally, no account required.",
};

export default function VideoCompressorPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Local tool — no account required"
          title="Compressor"
          subtitle="Re-encode a video at a smaller file size for faster uploads and sharing. Pick a quality level — lower produces a smaller file at a visible quality cost, higher preserves quality at a larger size."
        />
        <VideoCompressorWorkspace />
      </main>
      <SiteFooter />
    </div>
  );
}
