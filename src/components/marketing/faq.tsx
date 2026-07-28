import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "./reveal";

const FAQS = [
  {
    q: "Is there a paid plan?",
    a: "No. There's no pricing page, no subscription, no credits, and no export limit. Every feature is available to every account.",
  },
  {
    q: "Do I need a Gemini or OpenAI key to use Clippn?",
    a: "No. Local Media Mode covers cutting, cropping, compressing, and captioning without any AI key at all. A key only unlocks generation and transcription features.",
  },
  {
    q: "What happens to my API key once I paste it in?",
    a: "By default it's held only for your current session and never written to disk. If you opt into \"remember this key,\" it's individually encrypted before storage — we detail the exact model on the credential settings page.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. Clippn has no accounts at all — you clone the repo, run it on your own machine, and it's yours. Every project, connection, and setting lives in your own local database.",
  },
  {
    q: "Is my content used to train any model?",
    a: "No. Your media and generated output are yours. If you connect a third-party AI provider, their own terms govern how they use requests you send them.",
  },
];

export function Faq() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <Reveal>
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Questions people actually ask
        </h2>
      </Reveal>
      <div className="mt-10 divide-y divide-border/60 border-y border-border/60">
        {FAQS.map((item) => (
          <details key={item.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium">
              {item.q}
              <CaretDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
