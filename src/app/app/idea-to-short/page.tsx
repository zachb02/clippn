import { IdeaToShortTool } from "@/components/app/idea-to-short-tool";

export default function IdeaToShortPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Idea-to-Short</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Describe an idea and your connected AI provider writes a script, narrates it,
        generates a background, and renders a ready-to-post vertical short with captions.
      </p>
      <div className="mt-6">
        <IdeaToShortTool />
      </div>
    </div>
  );
}
