import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { VideoToAudioWorkspace } from "@/components/tools/video-to-audio-workspace";

export const metadata: Metadata = {
  title: "Video-to-Audio Converter — Clippn",
  description: "Extract the audio track from a video file. Runs locally, no account required.",
};

export default function VideoToAudioConverterPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Local tool — no account required"
          title="Video-to-Audio Converter"
          subtitle="Pull the audio track out of a video file as a standalone MP3, WAV, or AAC — for a podcast cut, a voiceover reference, or feeding another tool."
        />
        <VideoToAudioWorkspace />
      </main>
      <SiteFooter />
    </div>
  );
}
