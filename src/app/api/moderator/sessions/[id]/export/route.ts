import { NextRequest, NextResponse } from "next/server";
import { getSessionSnapshot } from "@/lib/db/queries";
import { requireModeratorResponse } from "@/lib/moderator-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const snapshot = await getSessionSnapshot(id, 10_000);
  if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const safeCode = snapshot.session.participantCode.replace(/[^a-zA-Z0-9_-]/g, "_") || "participant";
  if (request.nextUrl.searchParams.get("format") === "csv") {
    const rows = [
      ["id", "timestamp", "type", "screen", "action", "target", "taskRunId", "metadata"],
      ...snapshot.events.map((event) => [event.id, event.timestamp, event.type, event.screen, event.action, event.target, event.taskRunId, event.metadata]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="psb-${safeCode}-events.csv"`, "Cache-Control": "no-store" } });
  }

  return new NextResponse(JSON.stringify(snapshot, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="psb-${safeCode}-session.json"`, "Cache-Control": "no-store" } });
}
