import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { VoiceChangerWorkspace } from "@/components/tools/voice-changer-workspace";

export const metadata: Metadata = {
  title: "Voice Changer — Clippn",
  description:
    "Apply generic, non-identifying pitch presets to a recording. Runs locally, no account required.",
};

export default function VoiceChangerPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Local tool — no account required"
          title="Voice Changer"
          subtitle="Real pitch-shifting presets (asetrate + atempo) for tone and texture -- not impersonation. Runs through FFmpeg on your own machine."
        />
        <VoiceChangerWorkspace />
      </main>
      <SiteFooter />
    </div>
  );
}
