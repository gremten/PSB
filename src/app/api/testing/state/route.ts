import { NextResponse } from "next/server";
import { getResearchState } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getResearchState(), { headers: { "Cache-Control": "no-store" } });
}
