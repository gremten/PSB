import { NextRequest, NextResponse } from "next/server";
import { getRecordedSessionSnapshots, getResearchSummary } from "@/lib/db/queries";
import { requireModeratorResponse } from "@/lib/moderator-api";
import { buildAllSessionsMarkdownReport } from "@/lib/testing/session-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  const format = request.nextUrl.searchParams.get("format") ?? "md";
  if (format !== "md") return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  const [snapshots, summary] = await Promise.all([getRecordedSessionSnapshots(), getResearchSummary()]);
  const markdown = buildAllSessionsMarkdownReport(snapshots, summary);
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="psb-all-sessions-summary.md"`,
      "Cache-Control": "no-store",
    },
  });
}
