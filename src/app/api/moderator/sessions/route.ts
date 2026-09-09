import { NextRequest, NextResponse } from "next/server";
import { listSessions } from "@/lib/db/queries";
import { requireModeratorResponse } from "@/lib/moderator-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json({ sessions: await listSessions() }, { headers: { "Cache-Control": "no-store" } });
}
