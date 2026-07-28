import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/marketing/reveal";
import { Badge } from "@/components/ui/badge";
import { AI_TOOLS, LOCAL_TOOLS, type ToolEntry } from "@/lib/tools-directory";

export const metadata: Metadata = {
  title: "Tools — Clippn",
  description:
    "Every AI-assisted and local media tool in Clippn, in one directory. No account required for the local tools.",
};

function ToolCard({ tool, delay }: { tool: ToolEntry; delay: number }) {
  const card = (
    <div
      className={
        tool.slug
          ? "group h-full rounded-xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/40"
          : "h-full rounded-xl border border-border/60 bg-card/40 p-5 opacity-70"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <tool.icon className="size-5 text-primary" />
        {!tool.slug ? (
          <Badge variant="outline" className="shrink-0">
            Coming soon
          </Badge>
        ) : null}
      </div>
      <h3 className="mt-3 text-base font-semibold">{tool.label}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {tool.description}
      </p>
      <p className="mt-3 text-xs font-medium text-muted-foreground">
        {tool.requiresKey ? "Needs a provider connection" : "Works with no account"}
      </p>
    </div>
  );

  return (
    <Reveal delay={delay}>
      {tool.slug ? (
        <Link href={`/tools/${tool.slug}`} className="block h-full">
          {card}
        </Link>
      ) : (
        card
      )}
    </Reveal>
  );
}

export default function ToolsPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Tool directory"
          title="Twenty tools, one directory."
          subtitle="AI-assisted tools use a provider connection you supply. Local tools run through FFmpeg with no AI key and, for several of them, no account at all. Cards without a link haven't shipped yet — they're listed so you know what's planned, not to imply they already work."
        />

        <section className="mx-auto max-w-7xl px-6 py-16">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">AI tools</h2>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AI_TOOLS.map((tool, i) => (
              <ToolCard key={tool.label} tool={tool} delay={(i % 3) * 0.05} />
            ))}
          </div>
        </section>

        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <Reveal>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Local &amp; browser tools
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LOCAL_TOOLS.map((tool, i) => (
                <ToolCard key={tool.label} tool={tool} delay={(i % 3) * 0.05} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
