import { NextRequest, NextResponse } from "next/server";
import { finishTask, getAggregateMetrics, getResearchState, getSessionSnapshot, getTaskRun } from "@/lib/db/queries";
import { apiError, requireModeratorResponse } from "@/lib/moderator-api";
import type { TaskResult } from "@/lib/testing/types";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await context.params;
    const existing = await getTaskRun(id);
    if (!existing) throw new Error("Task not found");
    const body = (await request.json()) as { result?: TaskResult; easeScore?: number; easeReason?: string; moderatorNote?: string; corruptedReason?: string };
    if (!body.result || !["unaided", "aided", "failed", "corrupted"].includes(body.result)) throw new Error("Выберите результат");
    if (!Number.isInteger(body.easeScore) || body.easeScore! < 1 || body.easeScore! > 7) throw new Error("Оценка должна быть от 1 до 7");
    await finishTask(id, { result: body.result, easeScore: body.easeScore!, easeReason: body.easeReason, moderatorNote: body.moderatorNote, corruptedReason: body.corruptedReason });
    return NextResponse.json({ snapshot: await getSessionSnapshot(existing.sessionId), research: await getResearchState(), metrics: await getAggregateMetrics() });
  } catch (error) { return apiError(error); }
}
