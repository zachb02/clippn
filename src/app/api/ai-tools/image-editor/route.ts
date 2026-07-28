import { NextResponse } from "next/server";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { ImageEditorRequestSchema } from "@/lib/schemas/image-editor";
import { getProvider } from "@/lib/ai/registry";
import { getDefaultImageModelId } from "@/lib/ai/default-models";
import { resolveCredential } from "@/lib/credentials/resolve-credential";

export async function POST(request: Request) {
  const userId = await getOrCreateLocalUserId();

  const body = await request.json().catch(() => null);
  const parsed = ImageEditorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { connectionId, prompt, sourceImageUrl } = parsed.data;

  const credential = await resolveCredential(connectionId, userId);
  if (!credential) {
    return NextResponse.json({ error: "That provider connection isn't available. Reconnect it and try again." }, { status: 422 });
  }

  const provider = getProvider(credential.provider);
  if (!provider.editImage) {
    return NextResponse.json({ error: "This provider doesn't support image editing." }, { status: 422 });
  }

  try {
    const result = await provider.editImage(
      { prompt, sourceImageUrl, modelId: getDefaultImageModelId(credential.provider) },
      credential
    );
    return NextResponse.json({ imageUrl: result.imageUrl, mock: result.mock === true });
  } catch (error) {
    const normalized = provider.normalizeError(error);
    return NextResponse.json({ error: normalized.message, category: normalized.category }, { status: 422 });
  }
}
