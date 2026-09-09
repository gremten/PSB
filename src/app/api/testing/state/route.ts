import { NextResponse } from "next/server";
import { getResearchState } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getResearchState(), { headers: { "Cache-Control": "no-store" } });
}
