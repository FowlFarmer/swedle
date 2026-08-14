import { NextResponse } from "next/server";
import { z } from "zod";

import {
  hasSameOrigin,
  isPreviewEnvironment,
  issueAdminCookie,
  verifyAdminPassword,
} from "@/lib/server/cookies";

const schema = z.object({ password: z.string().min(1).max(500) });

export async function POST(request: Request) {
  if (!isPreviewEnvironment()) return new NextResponse(null, { status: 404 });
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const { password } = schema.parse(await request.json());
    if (!verifyAdminPassword(password)) return NextResponse.json({ error: "That passphrase is not valid." }, { status: 401 });
    await issueAdminCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter your passphrase." }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Sign-in failed." }, { status: 500 });
  }
}
