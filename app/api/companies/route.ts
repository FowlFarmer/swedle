import { NextResponse } from "next/server";

import { searchCompanies } from "@/lib/server/game-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const companies = await searchCompanies(query.slice(0, 80));
    return NextResponse.json(companies, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 503 });
  }
}
