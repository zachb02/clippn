import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { AudioBalancerWorkspace } from "@/components/tools/audio-balancer-workspace";

export const metadata: Metadata = {
  title: "Audio Balancer — Clippn",
  description: "Normalize loudness to a target level. Runs locally, no account required.",
};

export default function AudioBalancerPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Local tool — no account required"
          title="Audio Balancer"
          subtitle="Normalize a track or a video's audio to a consistent loudness target using FFmpeg's loudnorm filter, so dialogue and music beds don't clash and levels match across a project."
        />
        <AudioBalancerWorkspace />
      </main>
      <SiteFooter />
    </div>
  );
}
