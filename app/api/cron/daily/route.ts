import { NextResponse } from "next/server";

import { getOrCreateCurrentPuzzle } from "@/lib/server/game-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const puzzle = await getOrCreateCurrentPuzzle();
    return NextResponse.json({ ok: true, puzzleId: puzzle.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Puzzle creation failed." }, { status: 503 });
  }
}
