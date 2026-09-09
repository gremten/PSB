import { NextRequest, NextResponse } from "next/server";
import { getResearchState, getSessionSnapshot, markHint } from "@/lib/db/queries";
import { apiError, requireModeratorResponse } from "@/lib/moderator-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  try { const { id } = await context.params; markHint(id); return NextResponse.json({ snapshot: getSessionSnapshot(id), research: getResearchState() }); }
  catch (error) { return apiError(error); }
}
