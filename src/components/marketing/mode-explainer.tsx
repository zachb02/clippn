import { HardDrives, Key, Flask } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "./reveal";

const MODES = [
  {
    icon: HardDrives,
    title: "Local Media Mode",
    body: "Cutting, cropping, compressing, and captioning run entirely on-device through FFmpeg. No account, no AI key, no network call required.",
  },
  {
    icon: Key,
    title: "Connected AI Mode",
    body: "Paste a Google Gemini or OpenAI key to unlock generation and transcription. Your key is used only for your requests and never logged.",
  },
  {
    icon: Flask,
    title: "Mock Provider",
    body: "Every AI-assisted tool has a simulated mode — success, failure, rate limits, the works — so you can test the product with zero external calls.",
  },
];

export function ModeExplainer() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <Reveal>
        <div className="max-w-xl">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Three ways to run it
          </h2>
          <p className="mt-3 text-muted-foreground">
            You choose how much of the AI layer you want, if any at all.
          </p>
        </div>
      </Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {MODES.map((mode, i) => (
          <Reveal key={mode.title} delay={i * 0.08}>
            <div className="h-full rounded-xl border border-border/60 bg-card p-6">
              <mode.icon className="size-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{mode.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {mode.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
