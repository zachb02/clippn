import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { AudioConverterWorkspace } from "@/components/tools/audio-converter-workspace";

export const metadata: Metadata = {
  title: "Audio Converter — Clippn",
  description: "Convert between common audio formats. Runs locally, no account required.",
};

export default function AudioConverterPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Local tool — no account required"
          title="Audio Converter"
          subtitle="Convert an audio file between MP3, WAV, and AAC for whatever a platform, editor, or collaborator needs."
        />
        <AudioConverterWorkspace />
      </main>
      <SiteFooter />
    </div>
  );
}
