import { AutoClipTool } from "@/components/app/auto-clip-tool";

export const dynamic = "force-dynamic";

export default function AutoClipPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Auto Clip</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload a long-form video and your connected AI provider transcribes it,
        picks the most compelling moments, and renders them as ready-to-post
        vertical clips with real captions burned in.
      </p>
      <div className="mt-6">
        <AutoClipTool />
      </div>
    </div>
  );
}
