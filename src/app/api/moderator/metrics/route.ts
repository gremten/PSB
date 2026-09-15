import { NextRequest, NextResponse } from "next/server";
import { getAggregateMetrics, getResearchSummary } from "@/lib/db/queries";
import { requireModeratorResponse } from "@/lib/moderator-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  const [metrics, summary] = await Promise.all([getAggregateMetrics(), getResearchSummary()]);
  return NextResponse.json({ metrics, summary });
}
