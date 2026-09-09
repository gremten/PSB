import { NextRequest, NextResponse } from "next/server";
import { getResearchState, getSessionSnapshot, saveModeratorNote } from "@/lib/db/queries";
import { apiError, requireModeratorResponse } from "@/lib/moderator-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  try { const { id } = await context.params; const body = (await request.json()) as { note?: string }; saveModeratorNote(id, body.note ?? ""); return NextResponse.json({ snapshot: getSessionSnapshot(id), research: getResearchState() }); }
  catch (error) { return apiError(error); }
}
