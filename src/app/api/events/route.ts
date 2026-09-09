import { NextResponse } from "next/server";
import { recordParticipantEvent } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { eventName?: string; sessionId?: string; screen?: string; action?: string; target?: string; metadata?: Record<string, unknown> }
    | null;
  if (!body?.eventName || typeof body.eventName !== "string") {
    return NextResponse.json({ error: "eventName is required" }, { status: 400 });
  }
  const event = await recordParticipantEvent({
    eventName: body.eventName,
    sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
    screen: typeof body.screen === "string" ? body.screen : undefined,
    action: typeof body.action === "string" ? body.action : undefined,
    target: typeof body.target === "string" ? body.target : undefined,
    metadata: body.metadata,
  });
  return NextResponse.json({ accepted: Boolean(event), eventId: event?.id ?? null });
}
