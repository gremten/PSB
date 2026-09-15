import { NextRequest, NextResponse } from "next/server";
import { getFullSessionSnapshot, getResearchSummary } from "@/lib/db/queries";
import { requireModeratorResponse } from "@/lib/moderator-api";
import { buildSessionEventsCsv, buildSessionMarkdownReport, buildStarlSessionExport } from "@/lib/testing/session-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const snapshot = await getFullSessionSnapshot(id);
  if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const safeCode = snapshot.session.participantCode.replace(/[^a-zA-Z0-9_-]/g, "_") || "participant";
  if (request.nextUrl.searchParams.get("format") === "csv") {
    const csv = buildSessionEventsCsv(snapshot);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="psb-${safeCode}-events.csv"`, "Cache-Control": "no-store" } });
  }
  if (request.nextUrl.searchParams.get("format") === "md") {
    const markdown = buildSessionMarkdownReport(snapshot, undefined, await getResearchSummary());
    return new NextResponse(markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="psb-${safeCode}-report.md"`, "Cache-Control": "no-store" } });
  }

  return new NextResponse(JSON.stringify(buildStarlSessionExport(snapshot), null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="psb-${safeCode}-session.json"`, "Cache-Control": "no-store" } });
}
