import { NextResponse } from "next/server";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { ImageGeneratorRequestSchema } from "@/lib/schemas/image-generator";
import { getProvider } from "@/lib/ai/registry";
import { resolveCredential } from "@/lib/credentials/resolve-credential";

export async function POST(request: Request) {
  const userId = await getOrCreateLocalUserId();

  const body = await request.json().catch(() => null);
  const parsed = ImageGeneratorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { connectionId, prompt } = parsed.data;

  const credential = await resolveCredential(connectionId, userId);
  if (!credential) {
    return NextResponse.json({ error: "That provider connection isn't available. Reconnect it and try again." }, { status: 422 });
  }

  const provider = getProvider(credential.provider);
  if (!provider.generateImage) {
    return NextResponse.json({ error: "This provider doesn't support image generation." }, { status: 422 });
  }

  const framedPrompt = `A simple, clean square icon or avatar, centered composition, flat design: ${prompt}`;

  try {
    const result = await provider.generateImage({ prompt: framedPrompt, modelId: "mock-full" }, credential);
    return NextResponse.json({ imageUrl: result.imageUrl, mock: result.mock === true });
  } catch (error) {
    const normalized = provider.normalizeError(error);
    return NextResponse.json({ error: normalized.message, category: normalized.category }, { status: 422 });
  }
}
