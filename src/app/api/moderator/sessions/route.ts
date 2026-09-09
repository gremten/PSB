import { NextRequest, NextResponse } from "next/server";
import { createSession, getResearchState, listSessions } from "@/lib/db/queries";
import { apiError, requireModeratorResponse } from "@/lib/moderator-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json({ sessions: await listSessions(), research: await getResearchState() });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as { participantCode?: string; variant?: string };
    if (!body.participantCode?.trim()) throw new Error("Укажите код респондента");
    if (body.variant !== "connected" && body.variant !== "disconnected") throw new Error("Unknown variant");
    const current = await getResearchState();
    if (current.sessionStatus === "running" || current.sessionStatus === "draft") throw new Error("Сначала завершите текущую сессию");
    const session = await createSession(body.participantCode, body.variant);
    return NextResponse.json({ session, research: await getResearchState() }, { status: 201 });
  } catch (error) { return apiError(error); }
}
