import { ImageGeneratorTool } from "@/components/app/image-generator-tool";

export default function IconGeneratorPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Icon / Avatar Generator</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Produce channel icons and stylized avatars for faceless or branded projects
        using your connected AI provider.
      </p>
      <div className="mt-6">
        <ImageGeneratorTool
          endpoint="/api/ai-tools/icon-generator"
          placeholder="Describe the icon or avatar"
          imageClassName="size-40 rounded-lg border border-border/60 object-cover"
        />
      </div>
    </div>
  );
}
