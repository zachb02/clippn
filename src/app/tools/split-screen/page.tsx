import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { SplitScreenWorkspace } from "@/components/tools/split-screen-workspace";

export const metadata: Metadata = {
  title: "Split-Screen Video — Clippn",
  description:
    "Combine two videos into one split-screen short — top/bottom or side by side. Runs locally, no account required.",
};

export default function SplitScreenPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Local tool — no account required"
          title="Split-Screen Video"
          subtitle="Combine two video sources into one split-screen short — the classic gameplay-plus-facecam layout, or side by side. Runs through FFmpeg on your own machine as a structured filter graph."
        />
        <SplitScreenWorkspace />
      </main>
      <SiteFooter />
    </div>
  );
}
