import type { Metadata } from "next";
import { Crop } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { ToolShell } from "@/components/marketing/tool-shell";

export const metadata: Metadata = {
  title: "Video Cropper — Clippn",
  description:
    "Reframe a video to vertical, square, or a custom aspect ratio. Works without an account.",
};

export default function VideoCropperPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Local tool — no account required"
          title="Cropper"
          subtitle="Reframe a source video to a vertical 9:16, square 1:1, or a custom aspect ratio for the platform you're posting to. The crop region runs through FFmpeg on our servers as a structured filter — never a shell string built from your input."
        />
        <ToolShell
          icon={Crop}
          accepts="video file"
          steps={[
            "Upload a video file from your device.",
            "Choose a target aspect ratio, or drag the crop frame to a custom region.",
            "Position the frame over the part of the shot you want to keep, then export.",
          ]}
          notes="The cropper works without signing in. If you're signed in, the cropped output is saved to your project storage instead of only being available as a one-time download."
        />
      </main>
      <SiteFooter />
    </div>
  );
}
