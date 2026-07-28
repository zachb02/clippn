import Link from "next/link";
import { Lightbulb, Image as ImageIcon, UserSquare, PencilSimple } from "@phosphor-icons/react/dist/ssr";

const TOOLS = [
  { href: "/app/ai-tools/content-brainstorm", label: "Content Brainstorm", icon: Lightbulb },
  { href: "/app/ai-tools/image-generator", label: "AI Image Generator", icon: ImageIcon },
  { href: "/app/ai-tools/icon-generator", label: "Icon / Avatar Generator", icon: UserSquare },
  { href: "/app/ai-tools/image-editor", label: "AI Image Editor", icon: PencilSimple },
];

export default function AiToolsIndexPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">AI Tools</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Each tool runs through whichever provider connection you&apos;ve set up in
        Settings, including the Mock Provider.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/40"
          >
            <tool.icon className="size-5 text-primary" />
            <span className="text-sm font-medium">{tool.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
