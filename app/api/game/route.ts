import { NextResponse } from "next/server";

import { getOrCreatePlayerId } from "@/lib/server/cookies";
import { getGameState } from "@/lib/server/game-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getGameState(await getOrCreatePlayerId());
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The game could not be loaded." }, { status: 503 });
  }
}
