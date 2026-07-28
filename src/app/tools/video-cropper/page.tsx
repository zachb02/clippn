import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { VideoCropperWorkspace } from "@/components/tools/video-cropper-workspace";

export const metadata: Metadata = {
  title: "Video Cropper — Clippn",
  description:
    "Reframe a video to vertical, square, or its original aspect ratio. Runs locally, no account required.",
};

export default function VideoCropperPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Local tool — no account required"
          title="Cropper"
          subtitle="Reframe a source video to a vertical 9:16, square 1:1, 4:5, or its original aspect ratio. The crop region runs through FFmpeg on your own machine as a structured filter — never a shell string built from your input."
        />
        <VideoCropperWorkspace />
      </main>
      <SiteFooter />
    </div>
  );
}
