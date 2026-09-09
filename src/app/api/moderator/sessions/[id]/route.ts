import { NextRequest, NextResponse } from "next/server";
import { endSession, getAggregateMetrics, getResearchState, getSessionSnapshot, startSession } from "@/lib/db/queries";
import { apiError, requireModeratorResponse } from "@/lib/moderator-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const snapshot = getSessionSnapshot(id);
  return snapshot ? NextResponse.json({ snapshot, research: getResearchState(), metrics: getAggregateMetrics() }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { action?: string };
    const session = body.action === "start" ? startSession(id) : body.action === "end" ? endSession(id) : null;
    if (!session) throw new Error("Unknown session action");
    return NextResponse.json({ session, research: getResearchState(), snapshot: getSessionSnapshot(id) });
  } catch (error) { return apiError(error); }
}
