import { NextRequest, NextResponse } from "next/server";
import { assignParticipantScenario, deleteSession, endSession, getSessionSnapshot } from "@/lib/db/queries";
import { apiError, requireModeratorResponse } from "@/lib/moderator-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const afterParam = request.nextUrl.searchParams.get("after");
  const after = afterParam === null ? undefined : Number(afterParam);
  const snapshot = await getSessionSnapshot(id, 2000, after !== undefined && Number.isFinite(after) ? after : undefined);
  return snapshot ? NextResponse.json({ snapshot }, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const { id } = await context.params;
    if (body?.action === "end") return NextResponse.json({ session: await endSession(id) });
    if (body?.action === "assign_scenario" && typeof body.scenarioCode === "string") {
      return NextResponse.json({ status: await assignParticipantScenario(id, body.scenarioCode) });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  await deleteSession(id);
  return NextResponse.json({ deleted: true });
}
