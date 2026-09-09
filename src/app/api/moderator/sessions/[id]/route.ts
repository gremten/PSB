import { NextRequest, NextResponse } from "next/server";
import { getAggregateMetrics, getSessionSnapshot } from "@/lib/db/queries";
import { requireModeratorResponse } from "@/lib/moderator-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const snapshot = await getSessionSnapshot(id);
  return snapshot ? NextResponse.json({ snapshot, metrics: await getAggregateMetrics() }, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
