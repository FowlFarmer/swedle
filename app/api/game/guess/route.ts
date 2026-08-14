import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreatePlayerId, hasSameOrigin } from "@/lib/server/cookies";
import { GameInputError, submitGuess } from "@/lib/server/game-service";

const bodySchema = z.object({
  runToken: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(80),
});

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  try {
    const body = bodySchema.parse(await request.json());
    const state = await submitGuess(await getOrCreatePlayerId(), body.runToken, body.slug);
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Choose a valid company." }, { status: 400 });
    if (error instanceof GameInputError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Your guess could not be recorded." }, { status: 503 });
  }
}
