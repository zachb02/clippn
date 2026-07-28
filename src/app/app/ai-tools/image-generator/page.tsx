import { ImageGeneratorTool } from "@/components/app/image-generator-tool";

export default function ImageGeneratorPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">AI Image Generator</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create original thumbnails, backgrounds, and scene visuals from a text prompt
        using your connected AI provider.
      </p>
      <div className="mt-6">
        <ImageGeneratorTool
          endpoint="/api/ai-tools/image-generator"
          placeholder="Describe the image you want"
        />
      </div>
    </div>
  );
}
