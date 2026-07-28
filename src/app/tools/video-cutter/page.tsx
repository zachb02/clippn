import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { VideoCutterWorkspace } from "@/components/tools/video-cutter-workspace";

export const metadata: Metadata = {
  title: "Video Cutter — Clippn",
  description:
    "Trim a video to an in and out point with a lossless stream copy when possible. Runs locally, no account required.",
};

export default function VideoCutterPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Local tool — no account required"
          title="Video Cutter"
          subtitle="Set an in point and a duration, and the cutter trims the file through FFmpeg running on your own machine. When your cut lands on a keyframe, it uses a lossless stream copy instead of a full re-encode, so quality isn't lost and the trim finishes fast."
        />
        <VideoCutterWorkspace />
      </main>
      <SiteFooter />
    </div>
  );
}
