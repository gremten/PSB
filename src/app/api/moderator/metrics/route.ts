import { NextRequest, NextResponse } from "next/server";
import { getAggregateMetrics } from "@/lib/db/queries";
import { requireModeratorResponse } from "@/lib/moderator-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireModeratorResponse(request);
  return unauthorized ?? NextResponse.json({ metrics: await getAggregateMetrics() });
}
