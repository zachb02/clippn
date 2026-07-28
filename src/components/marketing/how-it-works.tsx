import { UploadSimple, Scissors, Export } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "./reveal";

const STEPS = [
  {
    icon: UploadSimple,
    title: "Import",
    body: "Drop in a long recording, or start from a written idea. Nothing leaves your machine unless you connect an AI key.",
  },
  {
    icon: Scissors,
    title: "Edit",
    body: "Cut, crop, caption, and arrange clips by hand, or let a workflow do the first pass while you stay in control.",
  },
  {
    icon: Export,
    title: "Export",
    body: "Render at the resolution and aspect ratio you need. No watermark, no plan-gated formats, no waiting for credits.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <Reveal>
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
      </Reveal>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 0.1}>
            <div className="rounded-xl border border-border/60 bg-card p-6">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <step.icon className="size-5 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                <span className="mr-2 text-muted-foreground">0{i + 1}</span>
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
