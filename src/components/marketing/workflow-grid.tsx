import {
  Scissors,
  GridFour,
  ChatCircleText,
  Broadcast,
  ClosedCaptioning,
  Lightbulb,
  UsersFour,
} from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "./reveal";

const WORKFLOWS = [
  {
    icon: Scissors,
    title: "Auto Clip",
    body: "Feed in a long video and pull the strongest moments into standalone clips.",
  },
  {
    icon: GridFour,
    title: "Split-Screen Video",
    body: "Pair two sources — gameplay and reaction, interview and B-roll — side by side.",
  },
  {
    icon: UsersFour,
    title: "Reddit-Style Story",
    body: "Turn a written story into a narrated, captioned video in a familiar format.",
  },
  {
    icon: ChatCircleText,
    title: "Fictional Chat Story",
    body: "Animate a fictional text conversation. Clearly labeled as fictional, every time.",
  },
  {
    icon: Broadcast,
    title: "Streamer Clip",
    body: "Cut highlight-worthy moments out of a longer stream recording.",
  },
  {
    icon: ClosedCaptioning,
    title: "Quick Subtitles",
    body: "Drop captions onto an existing video without touching anything else.",
  },
  {
    icon: Lightbulb,
    title: "Idea-to-Short",
    body: "Start from a one-line idea and build outward into a full short.",
  },
];

export function WorkflowGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <Reveal>
        <div className="max-w-xl">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Seven ways to start a project
          </h2>
          <p className="mt-3 text-muted-foreground">
            Pick a workflow that matches what you&apos;re making, or start from a blank
            timeline. Every workflow is available on every account.
          </p>
        </div>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WORKFLOWS.map((wf, i) => (
          <Reveal key={wf.title} delay={(i % 3) * 0.06}>
            <div className="group h-full rounded-xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/40">
              <wf.icon className="size-5 text-primary" />
              <h3 className="mt-3 text-base font-semibold">{wf.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {wf.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
