import { RedditStoryTool } from "@/components/app/reddit-story-tool";

export default function RedditStoryPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Reddit-Style Story</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Give a topic and your connected AI provider writes a story post, narrates it, and
        renders a ready-to-post vertical video with a story card and captions.
      </p>
      <div className="mt-6">
        <RedditStoryTool />
      </div>
    </div>
  );
}
