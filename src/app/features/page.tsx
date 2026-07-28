import type { Metadata } from "next";
import Link from "next/link";
import {
  Scissors,
  GridFour,
  ClosedCaptioning,
  Lightbulb,
  HardDrives,
  Key,
  Flask,
  ShieldCheck,
  Layout,
  Stack,
  Export,
} from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/marketing/reveal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Features — Clippn",
  description:
    "Every editing workflow, AI tool, and local media tool in Clippn, and exactly what runs with or without a provider key.",
};

const EDITOR_POINTS = [
  {
    icon: Layout,
    title: "Multitrack timeline",
    body: "Arrange video, images, audio, captions, text, overlays, shapes, and effects on independent tracks, with drag-to-trim and ripple edits.",
  },
  {
    icon: ClosedCaptioning,
    title: "Caption-first editing",
    body: "Word-level timing when a transcript supports it, segment-level timing as a fallback. Split, merge, shift, restyle, search, and replace text across an entire clip.",
  },
  {
    icon: Stack,
    title: "Templates and versions",
    body: "Save a timeline as a reusable template, or roll back to an earlier version of a project without losing your current draft.",
  },
  {
    icon: Export,
    title: "One export path",
    body: "Renders go through the same deterministic pipeline whether the source is a local upload or an AI-assisted asset. No separate 'export quality' tiers.",
  },
];

const WORKFLOWS = [
  {
    icon: Scissors,
    title: "Auto Clip",
    body: "Upload a long recording and the pipeline inspects it, transcribes the audio, segments the transcript into topics, and scores candidate clip boundaries for hook strength, pacing, and context completeness — then reframes the strongest ones for vertical video and opens them in the editor.",
  },
  {
    icon: GridFour,
    title: "Split-Screen Video",
    body: "Combine primary footage with gameplay, a screen recording, a reaction, or B-roll using top-and-bottom, side-by-side, picture-in-picture, reaction-panel, three-panel, or custom resizable layouts.",
  },
  {
    icon: Lightbulb,
    title: "Story and chat formats",
    body: "Build narrated Reddit-style story videos from text you have permission to reuse, or fictional chat videos with a visible, on-by-default disclosure so viewers know the conversation is dramatized.",
  },
  {
    icon: ClosedCaptioning,
    title: "Streamer Clip and Quick Subtitles",
    body: "Format gameplay, livestream, and webcam footage with face tracking, gameplay crop, facecam layouts, and silence removal, or drop clean captions onto an existing video without touching anything else.",
  },
];

const MODES = [
  {
    icon: HardDrives,
    title: "Local Media Mode",
    body: "Cutting, cropping, compressing, balancing audio, and captioning run through FFmpeg on the server or in the browser. No account and no AI key required.",
  },
  {
    icon: Key,
    title: "Connected AI Mode",
    body: "Connect a Google Gemini or OpenAI key to enable generation, transcription, and voice tools. The key is used only to fulfill your own requests.",
  },
  {
    icon: Flask,
    title: "Mock Provider",
    body: "Every AI-assisted tool runs against a simulated provider too, including simulated failures and rate limits, so you can evaluate the product with zero external calls.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Feature overview"
          title="Everything is included. Nothing is gated."
          subtitle="Clippn is one tier. The editor, the workflows, the AI tools, and the local media tools below are available to every account from the first minute — none of it sits behind a paid plan."
        />

        <section className="mx-auto max-w-7xl px-6 py-16">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              The editor
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {EDITOR_POINTS.map((point, i) => (
              <Reveal key={point.title} delay={(i % 2) * 0.06}>
                <div className="h-full rounded-xl border border-border/60 bg-card p-6">
                  <point.icon className="size-5 text-primary" />
                  <h3 className="mt-3 text-base font-semibold">{point.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {point.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <Reveal>
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  Six ways to start a project
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Pick a workflow that matches the raw material you have, or start from
                  a blank timeline and build it up manually.
                </p>
              </div>
            </Reveal>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {WORKFLOWS.map((wf, i) => (
                <Reveal key={wf.title} delay={(i % 2) * 0.06}>
                  <div className="h-full rounded-xl border border-border/60 bg-background p-6">
                    <wf.icon className="size-5 text-primary" />
                    <h3 className="mt-3 text-base font-semibold">{wf.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {wf.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  AI and local tools, kept structurally separate
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Twelve AI-assisted tools and eight local, browser-capable tools. A
                  tool either needs a provider connection or it doesn&apos;t — that&apos;s a
                  fixed property of the tool, never a runtime paywall check.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-fit"
                nativeButton={false}
                render={<Link href="/tools">Browse the tool directory</Link>}
              />
            </div>
          </Reveal>
        </section>

        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <Reveal>
              <div className="max-w-xl">
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  Three ways to run it
                </h2>
                <p className="mt-3 text-muted-foreground">
                  You choose how much of the AI layer you want, if any at all.
                </p>
              </div>
            </Reveal>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {MODES.map((mode, i) => (
                <Reveal key={mode.title} delay={i * 0.08}>
                  <div className="h-full rounded-xl border border-border/60 bg-background p-6">
                    <mode.icon className="size-6 text-primary" />
                    <h3 className="mt-4 text-lg font-semibold">{mode.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {mode.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <Reveal>
            <div className="rounded-xl border border-border/60 bg-card p-8 sm:p-10">
              <ShieldCheck className="size-6 text-primary" />
              <h2 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl">
                No paid plans, ever
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                There is no page for buying anything in this product, no recurring
                charge, no credit wallet, export-minute allowance, resolution
                restriction, or gated template tier anywhere in it. Reasonable limits
                exist only for abuse prevention and infrastructure stability, and they
                apply the same way to every account. If you connect a third-party AI
                provider, that provider&apos;s own usage and billing terms apply to your
                requests with them — that relationship is between you and the
                provider, and we disclose it before you submit a request.
              </p>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
