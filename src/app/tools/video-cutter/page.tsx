import type { Metadata } from "next";
import { Scissors } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { ToolShell } from "@/components/marketing/tool-shell";

export const metadata: Metadata = {
  title: "Video Cutter — Clippn",
  description:
    "Trim a video to an in and out point with a lossless stream copy when possible. Works without an account.",
};

export default function VideoCutterPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Local tool — no account required"
          title="Video Cutter"
          subtitle="Set an in point and an out point, and the cutter trims the file through FFmpeg on our servers. When your cut lands on a keyframe, it uses a lossless stream copy instead of a full re-encode, so quality isn't lost and the trim finishes fast."
        />
        <ToolShell
          icon={Scissors}
          accepts="video file"
          steps={[
            "Upload a video file from your device.",
            "Drag the in and out handles on the scrubber to set the range you want to keep.",
            "Preview the trimmed range, then export. The output keeps the source resolution and audio track.",
          ]}
          notes="The cutter works without signing in. If you're signed in, the trimmed output is saved to your project storage instead of only being available as a one-time download."
        />
      </main>
      <SiteFooter />
    </div>
  );
}
