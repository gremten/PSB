import { NextResponse } from "next/server";
import { heartbeatSession } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await heartbeatSession(id);
  return NextResponse.json({ active: Boolean(session && !session.endedAt) }, { headers: { "Cache-Control": "no-store" } });
}
