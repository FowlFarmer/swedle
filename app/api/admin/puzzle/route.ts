import { NextResponse } from "next/server";
import { z } from "zod";

import { hasSameOrigin, hasValidAdminCookie, isPreviewEnvironment } from "@/lib/server/cookies";
import { GameInputError, replacePuzzle } from "@/lib/server/game-service";

const schema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("random") }),
  z.object({ mode: z.literal("specific"), slug: z.string().regex(/^[a-z0-9-]+$/).max(80) }),
]);

export async function POST(request: Request) {
  if (!isPreviewEnvironment()) return new NextResponse(null, { status: 404 });
  if (!(await hasValidAdminCookie())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  try {
    const body = schema.parse(await request.json());
    return NextResponse.json(await replacePuzzle(body.mode, "slug" in body ? body.slug : undefined));
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Choose a valid action." }, { status: 400 });
    if (error instanceof GameInputError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "The puzzle could not be changed." }, { status: 503 });
  }
}
