import { NextResponse } from "next/server";

import { hasValidAdminCookie, isPreviewEnvironment } from "@/lib/server/cookies";
import { getAdminState } from "@/lib/server/game-service";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isPreviewEnvironment()) return new NextResponse(null, { status: 404 });
  if (!(await hasValidAdminCookie())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getAdminState(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Admin state could not be loaded." }, { status: 503 });
  }
}
