import { NextRequest, NextResponse } from "next/server";
import { deleteSession, endSession, getAggregateMetrics, getSessionSnapshot } from "@/lib/db/queries";
import { apiError, requireModeratorResponse } from "@/lib/moderator-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const snapshot = await getSessionSnapshot(id, 2000);
  return snapshot ? NextResponse.json({ snapshot, metrics: await getAggregateMetrics() }, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    if (body?.action !== "end") return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    const { id } = await context.params;
    return NextResponse.json({ session: await endSession(id) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  await deleteSession(id);
  return NextResponse.json({ deleted: true });
}
