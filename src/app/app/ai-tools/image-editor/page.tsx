import { ImageEditorTool } from "@/components/app/image-editor-tool";

export default function ImageEditorPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">AI Image Editor</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload an image and describe the edit you want using your connected AI
        provider.
      </p>
      <div className="mt-6">
        <ImageEditorTool />
      </div>
    </div>
  );
}
