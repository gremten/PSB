import { NextRequest, NextResponse } from "next/server";
import { getResearchState, getSessionSnapshot, startTask } from "@/lib/db/queries";
import { apiError, requireModeratorResponse } from "@/lib/moderator-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireModeratorResponse(request);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { taskCode?: string };
    if (!body.taskCode) throw new Error("Выберите задачу");
    const taskRun = await startTask(id, body.taskCode);
    return NextResponse.json({ taskRun, research: await getResearchState(), snapshot: await getSessionSnapshot(id) });
  } catch (error) { return apiError(error); }
}
