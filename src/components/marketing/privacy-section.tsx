import { LockKey, EyeSlash, Trash, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "./reveal";

const POINTS = [
  {
    icon: LockKey,
    text: "API keys are never stored in plain text. By default they live only for your session and touch disk nowhere.",
  },
  {
    icon: EyeSlash,
    text: "We never read, log, or transmit your key anywhere except directly to the provider you connected.",
  },
  {
    icon: ShieldCheck,
    text: "Choosing to \"remember\" a key encrypts it individually before it's ever written down.",
  },
  {
    icon: Trash,
    text: "Delete your account and your data is actually deleted — no soft-delete purgatory, no support ticket required.",
  },
];

export function PrivacySection() {
  return (
    <section className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <Reveal>
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Your keys are yours
            </h2>
            <p className="mt-3 text-muted-foreground">
              The credential system was built around one rule: your AI provider key
              should never be easier to steal than it is to use.
            </p>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {POINTS.map((point, i) => (
            <Reveal key={point.text} delay={i * 0.06}>
              <div className="flex h-full items-start gap-3 rounded-xl border border-border/60 bg-background p-5">
                <point.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {point.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
