import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { MediaInspectorWorkspace } from "@/components/tools/media-inspector-workspace";

export const metadata: Metadata = {
  title: "Media Inspector — Clippn",
  description: "Read codec, resolution, and stream metadata for any file. Runs locally, no account required.",
};

export default function MediaInspectorPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Local tool — no account required"
          title="Media Inspector"
          subtitle="Surface exactly what FFprobe sees in a file — container, codecs, resolution, duration, bit rate — before you decide what to do with it."
        />
        <MediaInspectorWorkspace />
      </main>
      <SiteFooter />
    </div>
  );
}
