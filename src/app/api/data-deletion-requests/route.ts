import { NextResponse } from "next/server";
import { dataDeletionRequestSchema } from "@/lib/schemas/request-forms";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { received: false, error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const result = dataDeletionRequestSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { received: false, error: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Intake only for now: no data_deletion_requests table exists yet. This confirms
  // the request is well-formed and accepted; a future pass wires it to durable
  // storage and the actual account/data purge job.
  return NextResponse.json({ received: true }, { status: 200 });
}
