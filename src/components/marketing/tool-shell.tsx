import type { Icon } from "@phosphor-icons/react";
import { CloudArrowUp } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "./reveal";
import { Button } from "@/components/ui/button";

export function ToolShell({
  icon: ToolIcon,
  accepts,
  steps,
  notes,
}: {
  icon: Icon;
  accepts: string;
  steps: string[];
  notes: string;
}) {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <Reveal>
        <div className="rounded-xl border border-border/60 bg-card p-6 sm:p-8">
          <h2 className="text-lg font-semibold">How it works</h2>
          <ol className="mt-4 space-y-3">
            {steps.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <div
          aria-disabled="true"
          className="mt-6 flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border/60 bg-card/40 p-12 text-center"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
            <ToolIcon className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Drop a {accepts} here</p>
            <p className="mt-1 text-sm text-muted-foreground">or choose a file from your device</p>
          </div>
          <Button disabled>
            <CloudArrowUp />
            Choose a file
          </Button>
          <p className="max-w-sm text-xs text-muted-foreground">
            Uploads are disabled on this page for now — the interactive editor is being
            wired up separately. Nothing here processes media yet.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.14}>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{notes}</p>
      </Reveal>
    </section>
  );
}
