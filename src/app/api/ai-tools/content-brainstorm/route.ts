import { NextResponse } from "next/server";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { ContentBrainstormRequestSchema } from "@/lib/schemas/content-brainstorm";
import { getProvider } from "@/lib/ai/registry";
import { resolveCredential } from "@/lib/credentials/resolve-credential";

export async function POST(request: Request) {
  const userId = await getOrCreateLocalUserId();

  const body = await request.json().catch(() => null);
  const parsed = ContentBrainstormRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { connectionId, topic } = parsed.data;

  const credential = await resolveCredential(connectionId, userId);
  if (!credential) {
    return NextResponse.json({ error: "That provider connection isn't available. Reconnect it and try again." }, { status: 422 });
  }

  const provider = getProvider(credential.provider);
  if (!provider.generateText) {
    return NextResponse.json({ error: "This provider doesn't support text generation." }, { status: 422 });
  }

  const prompt = `Give me 3 short-form video hooks, 3 title options, and a 5-point outline for a video about: ${topic}`;

  try {
    const result = await provider.generateText({ prompt, modelId: "mock-full" }, credential);
    return NextResponse.json({ text: result.text, mock: result.mock === true });
  } catch (error) {
    const normalized = provider.normalizeError(error);
    return NextResponse.json({ error: normalized.message, category: normalized.category }, { status: 422 });
  }
}
