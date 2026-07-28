import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { SpeechEnhancerWorkspace } from "@/components/tools/speech-enhancer-workspace";

export const metadata: Metadata = {
  title: "Speech Enhancer — Clippn",
  description: "Reduce background noise and room tone with real FFT-based denoising. Runs locally, no account required.",
};

export default function SpeechEnhancerPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Local tool — no account required"
          title="Speech Enhancer"
          subtitle="Clean up room tone, hiss, and fan noise in spoken-word audio using FFmpeg's FFT-based denoiser, running on your own machine before it hits your timeline."
        />
        <SpeechEnhancerWorkspace />
      </main>
      <SiteFooter />
    </div>
  );
}
