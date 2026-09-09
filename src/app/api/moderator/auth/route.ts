import { NextResponse } from "next/server";
import { MODERATOR_COOKIE, moderatorToken } from "@/lib/moderator-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.MODERATOR_SECRET) {
    return NextResponse.json({ error: "MODERATOR_SECRET is not configured" }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { secret?: string } | null;
  if (!body?.secret || body.secret !== process.env.MODERATOR_SECRET) {
    return NextResponse.json({ error: "Неверный секрет" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(MODERATOR_COOKIE, moderatorToken()!, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  return response;
}

export function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(MODERATOR_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
