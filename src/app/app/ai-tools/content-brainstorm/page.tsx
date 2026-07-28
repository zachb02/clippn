import { ContentBrainstormTool } from "@/components/app/content-brainstorm-tool";

export default function AiToolsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Content Brainstorm</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Generate hooks, titles, and an outline from a topic using your connected AI
        provider.
      </p>
      <div className="mt-6">
        <ContentBrainstormTool />
      </div>
    </div>
  );
}
