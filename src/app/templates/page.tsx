import type { Metadata } from "next";
import Link from "next/link";
import { GridFour, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/marketing/reveal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Templates — Clippn",
  description:
    "The public template gallery is not built yet. See what's planned and where to save a project as a template today.",
};

export default function TemplatesPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Coming soon"
          title="Templates are on the way."
          subtitle="A public gallery of reusable timeline templates — layouts, caption styles, and workflow presets you can drop straight into a new project — is planned for a later phase. It isn't built yet, and this page won't pretend otherwise with placeholder templates."
        />

        <section className="mx-auto max-w-4xl px-6 py-16">
          <Reveal>
            <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-12 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
                <GridFour className="size-6 text-muted-foreground" />
              </div>
              <h2 className="mt-5 text-lg font-semibold">No templates yet</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                When the gallery ships, browsable templates will appear here — sorted
                by workflow, with a plain-language description of what each one sets
                up on your timeline.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mt-6 flex flex-col items-start gap-4 rounded-xl border border-border/60 bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold">
                  Want to reuse your own timeline right now?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Personal templates — saving your own timeline for reuse, and
                  exporting or importing it as JSON — land inside the editor before the
                  public gallery does.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-fit shrink-0"
                nativeButton={false}
                render={
                  <Link href="/tools">
                    Explore the tools
                    <ArrowRight />
                  </Link>
                }
              />
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
