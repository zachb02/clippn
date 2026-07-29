import Link from "next/link";
import { Scissors, Sparkle, Article } from "@phosphor-icons/react/dist/ssr";

const WORKFLOWS = [
  {
    href: "/app/auto-clip",
    label: "Auto Clip",
    icon: Scissors,
    description: "Upload a long-form video or paste a YouTube link — the AI finds the best moments and cuts them into vertical clips.",
  },
  {
    href: "/app/idea-to-short",
    label: "Idea-to-Short",
    icon: Sparkle,
    description: "Start from just a topic — the AI writes a script, narrates it, generates a background, and renders a full short.",
  },
  {
    href: "/app/reddit-story",
    label: "Reddit-Style Story",
    icon: Article,
    description: "Give a topic — the AI writes a story post, narrates it, and renders a story-card video with captions.",
  },
];

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Create</h1>
      <p className="mt-2 text-sm text-muted-foreground">Pick how you want to start.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {WORKFLOWS.map((workflow) => (
          <Link
            key={workflow.href}
            href={workflow.href}
            className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/40"
          >
            <workflow.icon className="size-5 text-primary" />
            <span className="text-sm font-semibold">{workflow.label}</span>
            <span className="text-sm text-muted-foreground">{workflow.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
